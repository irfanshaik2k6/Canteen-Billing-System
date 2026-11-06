// Represents a customer, extending the Person class
public class Customer extends Person {
    // Unique identifier for the customer
    private String customerId;

    // Constructor initializing customer details using super()
    public Customer(String customerId, String name, String phone) {
        super(name, phone);
        this.customerId = customerId;
    }

    // Getter for customerId
    public String getCustomerId() {
        return customerId;
    }
}

