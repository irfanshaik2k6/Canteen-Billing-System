// Abstract base class for canteen menu items
public abstract class MenuItem {
    // Protected fields accessible by subclasses
    protected String name;
    protected double price;

    // Constructor to initialize menu item details
    public MenuItem(String name, double price) {
        this.name = name;
        this.price = price;
    }

    // Getter for name
    public String getName() {
        return name;
    }

    // Getter for price
    public double getPrice() {
        return price;
    }

    // Abstract method to calculate price based on quantity
    public abstract double calculatePrice(int quantity);

    // Abstract method to get the category of the item
    public abstract String getCategory();

    // Displays menu item details
    public void display() {
        System.out.println("Item: " + name + " | Price: " + price + " | Category: " + getCategory());
    }
}

