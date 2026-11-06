// Represents a snack menu item with 5% GST
public class Snack extends MenuItem {

    // Constructor initializing snack details
    public Snack(String name, double price) {
        super(name, price);
    }

    // Calculates price including 5% GST
    @Override
    public double calculatePrice(int quantity) {
        return price * quantity * 1.05;
    }

    // Returns the category name
    @Override
    public String getCategory() {
        return "Snack";
    }
}

