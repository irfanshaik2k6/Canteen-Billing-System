// Represents a regular meal item with bulk discount
public class Meal extends MenuItem {

    // Constructor initializing meal details
    public Meal(String name, double price) {
        super(name, price);
    }

    // Calculates price with a 10% discount if quantity is 3 or more
    @Override
    public double calculatePrice(int quantity) {
        double total = price * quantity;
        if (quantity >= 3) {
            total *= 0.90; // 10% discount
        }
        return total;
    }

    // Returns the category name
    @Override
    public String getCategory() {
        return "Meal";
    }
}

