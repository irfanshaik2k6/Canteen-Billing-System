// Represents a beverage menu item with standard pricing (no tax)
public class Beverage extends MenuItem {

    // Constructor initializing beverage details
    public Beverage(String name, double price) {
        super(name, price);
    }

    // Calculates price without any tax
    @Override
    public double calculatePrice(int quantity) {
        return price * quantity;
    }

    // Returns the category name
    @Override
    public String getCategory() {
        return "Beverage";
    }
}