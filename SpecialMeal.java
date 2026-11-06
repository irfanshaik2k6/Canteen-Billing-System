// Represents a special meal item inheriting from Meal (multilevel inheritance)
public class SpecialMeal extends Meal {

    // Constructor initializing special meal details
    public SpecialMeal(String name, double price) {
        super(name, price);
    }

    // Calculates price using Meal's discount logic plus Rs. 20 per plate
    @Override
    public double calculatePrice(int quantity) {
        return super.calculatePrice(quantity) + (20 * quantity);
    }

    // Returns the category name
    @Override
    public String getCategory() {
        return "Special Meal";
    }
}

