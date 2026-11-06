import java.util.ArrayList;

// Represents a customer's order containing items and their respective quantities
public class Order {
    // Customer associated with the order
    private Customer customer;

    // Parallel lists holding items and their ordered quantities
    private ArrayList<MenuItem> items;
    private ArrayList<Integer> quantities;

    // Constructor initializing the customer and empty order lists
    public Order(Customer customer) {
        this.customer = customer;
        this.items = new ArrayList<>();
        this.quantities = new ArrayList<>();
    }

    // Adds a menu item and its quantity to the order
    public void addItem(MenuItem item, int quantity) {
        if (item != null && quantity > 0) {
            items.add(item);
            quantities.add(quantity);
        }
    }

    // Checks whether the order has any items
    public boolean isEmpty() {
        return items.isEmpty();
    }

    // Prints a neatly formatted console receipt using printf alignment
    public void printBill() {
        if (isEmpty()) {
            System.out.println("The order is empty.");
            return;
        }

        System.out.println("\n=======================================================");
        System.out.println("                   CANTEEN RECEIPT                     ");
        System.out.println("=======================================================");
        System.out.println("Customer ID : " + customer.getCustomerId());
        System.out.println("Name        : " + customer.getName());
        System.out.println("Phone       : " + customer.getPhone());
        System.out.println("-------------------------------------------------------");
        System.out.printf("%-18s %-14s %-6s %-12s%n", "Item Name", "Category", "Qty", "Amount (Rs.)");
        System.out.println("-------------------------------------------------------");

        double grandTotal = 0.0;
        for (int i = 0; i < items.size(); i++) {
            MenuItem item = items.get(i);
            int qty = quantities.get(i);

            // Polymorphic method call to calculatePrice()
            double itemAmount = item.calculatePrice(qty);
            grandTotal += itemAmount;

            System.out.printf("%-18s %-14s %-6d Rs. %-10.2f%n", 
                              item.getName(), item.getCategory(), qty, itemAmount);
        }

        System.out.println("-------------------------------------------------------");
        System.out.printf("%-40s Rs. %-10.2f%n", "Grand Total:", grandTotal);
        System.out.println("=======================================================\n");
    }
}
