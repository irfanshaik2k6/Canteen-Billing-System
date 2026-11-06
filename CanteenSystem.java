import java.util.Scanner;

// Main driver class managing menu presentation, order taking, and bill generation
public class CanteenSystem {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // Menu defined as a MenuItem[] array
        MenuItem[] menu = {
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

        System.out.println("==========================================");
        System.out.println("     WELCOME TO CANTEEN BILLING SYSTEM    ");
        System.out.println("==========================================");

        // Ask for customer name and phone
        System.out.print("Enter Customer Name: ");
        String name = scanner.nextLine().trim();

        System.out.print("Enter Customer Phone: ");
        String phone = scanner.nextLine().trim();

        // Create Customer and Order objects
        Customer customer = new Customer("C001", name, phone);
        Order order = new Order(customer);

        System.out.println("\nWelcome, " + customer.getName() + "!");

        // Order processing loop
        while (true) {
            // Display numbered menu
            System.out.println("\n------------------ MENU ------------------");
            for (int i = 0; i < menu.length; i++) {
                System.out.printf("%d. ", (i + 1));
                menu[i].display();
            }
            System.out.println("0. Generate Bill & Finish");
            System.out.println("------------------------------------------");
            System.out.print("Select item number (0 to generate bill): ");

            int choice;
            try {
                choice = Integer.parseInt(scanner.nextLine().trim());
            } catch (NumberFormatException e) {
                System.out.println("Error: Invalid input! Please enter a numeric value.");
                continue;
            }

            // Enter 0 to generate bill
            if (choice == 0) {
                // Validate if order is empty
                if (order.isEmpty()) {
                    System.out.println("Error: Your order is empty! Please add at least one item before generating the bill.");
                    continue;
                }
                break; // Exit loop to print bill
            }

            // Validate menu number range
            if (choice < 1 || choice > menu.length) {
                System.out.println("Error: Invalid menu choice! Please select a number between 1 and " + menu.length + ".");
                continue;
            }

            MenuItem selectedItem = menu[choice - 1];

            // Prompt for quantity
            System.out.print("Enter quantity for " + selectedItem.getName() + ": ");
            int quantity;
            try {
                quantity = Integer.parseInt(scanner.nextLine().trim());
            } catch (NumberFormatException e) {
                System.out.println("Error: Invalid quantity! Please enter a numeric value.");
                continue;
            }

            // Validate quantity > 0
            if (quantity <= 0) {
                System.out.println("Error: Quantity must be greater than 0.");
                continue;
            }

            // Add item to order
            order.addItem(selectedItem, quantity);
            System.out.println("Added " + quantity + " x " + selectedItem.getName() + " to order successfully.");
        }

        // Call printBill() at the end
        order.printBill();

        // Save bill to bills.txt using FileWriter in append mode with date and time
        BillLogger.saveBill(order);

        scanner.close();
    }
}
