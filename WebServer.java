import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// WebServer hosting HTTP endpoints and static web files using Java's built-in HttpServer
public class WebServer {
    private static final int PORT = 8080;
    private static final String WEB_ROOT = "web";
    private static final String ORDERS_FILE = "orders.txt";

    // Menu catalog matching canteen offerings
    private static final MenuItem[] MENU = {
        new Beverage("Tea", 15),
        new Beverage("Coffee", 25),
        new Beverage("Fruit Juice", 40),
        new Snack("Samosa", 20),
        new Snack("Puff", 25),
        new Snack("Sandwich", 40),
        new Meal("Veg Meals", 70),
        new Meal("Chapati Curry", 60),
        new SpecialMeal("Chicken Biryani", 120)
    };

    public static void main(String[] args) throws IOException {
        // Create HTTP server on port 8080
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        // Register API handlers
        server.createContext("/api/menu", new MenuHandler());
        server.createContext("/api/bill", new BillHandler());
        server.createContext("/api/orders", new OrdersHandler());
        server.createContext("/api/history", new HistoryHandler());

        // Register static file handler for web root
        server.createContext("/", new StaticFileHandler());

        // Use multi-threaded executor
        server.setExecutor(Executors.newFixedThreadPool(10));
        server.start();

        System.out.println("==================================================");
        System.out.println(" Canteen WebServer started successfully!         ");
        System.out.println(" URL: http://localhost:" + PORT + "/               ");
        System.out.println(" API Endpoints:                                   ");
        System.out.println("   GET  /api/menu                                ");
        System.out.println("   POST /api/bill                                ");
        System.out.println("   GET  /api/orders                              ");
        System.out.println("   GET  /api/history                             ");
        System.out.println("==================================================");
    }

    // Handles GET /api/menu and returns menu as JSON
    static class MenuHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendError(exchange, 405, "Method Not Allowed. Use GET.");
                return;
            }

            try {
                StringBuilder sb = new StringBuilder();
                sb.append("[");
                for (int i = 0; i < MENU.length; i++) {
                    if (i > 0) sb.append(",");
                    sb.append("{")
                      .append("\"id\":").append(i + 1).append(",")
                      .append("\"name\":\"").append(escapeJson(MENU[i].getName())).append("\",")
                      .append("\"price\":").append(MENU[i].getPrice()).append(",")
                      .append("\"category\":\"").append(escapeJson(MENU[i].getCategory())).append("\"")
                      .append("}");
                }
                sb.append("]");

                sendJson(exchange, 200, sb.toString());
            } catch (Exception e) {
                sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
            }
        }
    }

    // Handles POST /api/bill, saves to orders.txt, and returns calculated bill as JSON
    static class BillHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendError(exchange, 405, "Method Not Allowed. Use POST.");
                return;
            }

            try {
                String body = readRequestBody(exchange.getRequestBody());

                // Parse customer details
                Matcher nameMatcher = Pattern.compile("\"name\"\\s*:\\s*\"([^\"]*)\"").matcher(body);
                String customerName = nameMatcher.find() ? nameMatcher.group(1).trim() : "Guest";

                Matcher phoneMatcher = Pattern.compile("\"phone\"\\s*:\\s*\"([^\"]*)\"").matcher(body);
                String customerPhone = phoneMatcher.find() ? phoneMatcher.group(1).trim() : "N/A";

                // Build Customer and Order objects
                Customer customer = new Customer("C001", customerName, customerPhone);
                Order order = new Order(customer);

                // Parse items
                Matcher blockMatcher = Pattern.compile("\\{([^}]+)\\}").matcher(body);
                List<Integer> selectedItemIds = new ArrayList<>();
                List<Integer> selectedQuantities = new ArrayList<>();
                StringBuilder itemsSummary = new StringBuilder();

                while (blockMatcher.find()) {
                    String block = blockMatcher.group(1);
                    Matcher idMatcher = Pattern.compile("\"itemId\"\\s*:\\s*(\\d+)").matcher(block);
                    Matcher qtyMatcher = Pattern.compile("\"quantity\"\\s*:\\s*(\\d+)").matcher(block);

                    if (idMatcher.find() && qtyMatcher.find()) {
                        int itemId = Integer.parseInt(idMatcher.group(1));
                        int qty = Integer.parseInt(qtyMatcher.group(1));

                        if (itemId >= 1 && itemId <= MENU.length && qty > 0) {
                            MenuItem item = MENU[itemId - 1];
                            order.addItem(item, qty);
                            selectedItemIds.add(itemId);
                            selectedQuantities.add(qty);

                            if (itemsSummary.length() > 0) {
                                itemsSummary.append(", ");
                            }
                            itemsSummary.append(item.getName()).append(" x").append(qty);
                        }
                    }
                }

                if (order.isEmpty()) {
                    sendError(exchange, 400, "Bad Request: Order must contain at least one valid item with quantity > 0.");
                    return;
                }

                // Log formatted bill to bills.txt via BillLogger
                BillLogger.saveBill(order);

                // Build bill JSON response using StringBuilder
                StringBuilder sb = new StringBuilder();
                sb.append("{")
                  .append("\"customerId\":\"").append(escapeJson(customer.getCustomerId())).append("\",")
                  .append("\"name\":\"").append(escapeJson(customer.getName())).append("\",")
                  .append("\"phone\":\"").append(escapeJson(customer.getPhone())).append("\",")
                  .append("\"items\":[");

                double grandTotal = 0.0;
                for (int i = 0; i < selectedItemIds.size(); i++) {
                    if (i > 0) sb.append(",");
                    int itemId = selectedItemIds.get(i);
                    int qty = selectedQuantities.get(i);
                    MenuItem item = MENU[itemId - 1];

                    // Polymorphic price calculation
                    double amount = item.calculatePrice(qty);
                    grandTotal += amount;

                    sb.append("{")
                      .append("\"itemId\":").append(itemId).append(",")
                      .append("\"name\":\"").append(escapeJson(item.getName())).append("\",")
                      .append("\"category\":\"").append(escapeJson(item.getCategory())).append("\",")
                      .append("\"price\":").append(item.getPrice()).append(",")
                      .append("\"quantity\":").append(qty).append(",")
                      .append("\"amount\":").append(String.format(java.util.Locale.US, "%.2f", amount))
                      .append("}");
                }

                sb.append("],")
                  .append("\"grandTotal\":").append(String.format(java.util.Locale.US, "%.2f", grandTotal))
                  .append("}");

                // Save order summary to orders.txt on server for GET /api/orders
                saveOrderRecord(customer.getName(), customer.getPhone(), itemsSummary.toString(), grandTotal);

                sendJson(exchange, 200, sb.toString());
            } catch (Exception e) {
                sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
            }
        }
    }

    // Appends an order record to orders.txt in append mode
    private static synchronized void saveOrderRecord(String name, String phone, String items, double total) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"));
        String recordJson = "{"
            + "\"timestamp\":\"" + escapeJson(timestamp) + "\","
            + "\"name\":\"" + escapeJson(name) + "\","
            + "\"phone\":\"" + escapeJson(phone) + "\","
            + "\"items\":\"" + escapeJson(items) + "\","
            + "\"total\":" + String.format(java.util.Locale.US, "%.2f", total)
            + "}";

        try (FileWriter fw = new FileWriter(ORDERS_FILE, true)) {
            fw.write(recordJson + System.lineSeparator());
        } catch (IOException e) {
            System.out.println("Error appending to orders.txt: " + e.getMessage());
        }
    }

    // Handles GET /api/orders and returns all past orders from orders.txt as a JSON array
    static class OrdersHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendError(exchange, 405, "Method Not Allowed. Use GET.");
                return;
            }

            File file = new File(ORDERS_FILE);
            if (!file.exists()) {
                sendJson(exchange, 200, "[]");
                return;
            }

            StringBuilder sb = new StringBuilder();
            sb.append("[");
            boolean first = true;

            try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (!line.isEmpty()) {
                        if (!first) {
                            sb.append(",");
                        }
                        sb.append(line);
                        first = false;
                    }
                }
            } catch (IOException e) {
                sendError(exchange, 500, "Error reading orders.txt: " + e.getMessage());
                return;
            }

            sb.append("]");
            sendJson(exchange, 200, sb.toString());
        }
    }

    // Handles GET /api/history to return raw text log from bills.txt
    static class HistoryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            File file = new File("bills.txt");
            if (!file.exists()) {
                sendJson(exchange, 200, "{\"history\":\"No order history recorded yet.\"}");
                return;
            }

            byte[] bytes = Files.readAllBytes(file.toPath());
            String text = new String(bytes, StandardCharsets.UTF_8);
            sendJson(exchange, 200, "{\"history\":\"" + escapeJson(text) + "\"}");
        }
    }

    // Serves static assets from the "web" folder
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                exchange.close();
                return;
            }

            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendError(exchange, 405, "Method Not Allowed");
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (path == null || path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            File baseDir = new File(WEB_ROOT);
            File file = new File(baseDir, path.startsWith("/") ? path.substring(1) : path);

            // Prevent directory traversal attacks
            String canonicalBasePath = baseDir.getCanonicalPath();
            String canonicalFilePath = file.getCanonicalPath();
            if (!canonicalFilePath.startsWith(canonicalBasePath) || !file.exists() || file.isDirectory()) {
                sendError(exchange, 404, "File Not Found: " + path);
                return;
            }

            String contentType = getContentType(file.getName());
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, file.length());

            try (FileInputStream fis = new FileInputStream(file);
                 OutputStream os = exchange.getResponseBody()) {
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) {
                    os.write(buffer, 0, bytesRead);
                }
            }
        }
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static void sendError(HttpExchange exchange, int statusCode, String message) throws IOException {
        String json = "{\"error\":\"" + escapeJson(message) + "\"}";
        sendJson(exchange, statusCode, json);
    }

    private static String readRequestBody(InputStream is) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[1024];
        int nRead;
        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        return buffer.toString(StandardCharsets.UTF_8.name());
    }

    private static String getContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=UTF-8";
        if (lower.endsWith(".css")) return "text/css; charset=UTF-8";
        if (lower.endsWith(".js")) return "application/javascript; charset=UTF-8";
        if (lower.endsWith(".json")) return "application/json; charset=UTF-8";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        return "text/plain; charset=UTF-8";
    }

    private static String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\b", "\\b")
                  .replace("\f", "\\f")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
}
