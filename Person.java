// Represents a base person in the canteen system
public class Person {
    // Protected fields accessible by subclasses
    protected String name;
    protected String phone;

    // Constructor to initialize person details
    public Person(String name, String phone) {
        this.name = name;
        this.phone = phone;
    }

    // Getter for name
    public String getName() {
        return name;
    }

    // Getter for phone
    public String getPhone() {
        return phone;
    }
}

