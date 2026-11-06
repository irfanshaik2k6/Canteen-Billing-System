import java.io.ByteArrayOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

// Utility class to save bills to a text file without modifying existing classes
public class BillLogger {

    // Saves the given order's bill to "bills.txt" in append mode with date and time
    public static void saveBill(Order order) {
        if (order == null || order.isEmpty()) {
            return;
        }

        // Capture output of order.printBill() without changing Order class
        PrintStream originalOut = System.out;
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintStream captureStream = new PrintStream(baos);

        try {
            System.setOut(captureStream);
            order.printBill();
        } finally {
            System.setOut(originalOut);
        }

        String receiptText = baos.toString();

        // Write to bills.txt using FileWriter in append mode
        try (FileWriter writer = new FileWriter("bills.txt", true)) {
            LocalDateTime now = LocalDateTime.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss");

            writer.write("Timestamp: " + now.format(formatter) + System.lineSeparator());
            writer.write(receiptText);
            writer.write(System.lineSeparator());
            System.out.println("Bill appended to bills.txt successfully!");
        } catch (IOException e) {
            System.out.println("Error writing to bills.txt: " + e.getMessage());
        }
    }
}

