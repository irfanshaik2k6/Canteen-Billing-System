# CanteenSystem - Java Console & Web Billing Application

A complete, lightweight, plain Java console and web-based canteen billing application demonstrating core Object-Oriented Programming (OOP) principles without external libraries, Maven, Spring, or GUI frameworks.

---

## 🏗️ Class Hierarchy & Architecture

```
Person (protected name, phone)
  └── Customer (private customerId)

MenuItem (abstract: name, price, calculatePrice(), getCategory(), display())
  ├── Beverage (price * quantity, no tax)
  ├── Snack (price * quantity * 1.05, 5% GST)
  └── Meal (10% discount if quantity >= 3)
        └── SpecialMeal (super.calculatePrice() + Rs. 20/plate)

Order (Customer, ArrayList<MenuItem>, ArrayList<Integer>, printBill())
BillLogger (saves bills to bills.txt in append mode with timestamps using FileWriter)
CanteenSystem (console main entry point, MenuItem[] menu array, interactive loop, validation)
WebServer (built-in com.sun.net.httpserver.HttpServer on port 8080, REST API & static files)
```

---

## 🎯 Object-Oriented Principles Demonstrated

| Concept | Implementation in Project |
| :--- | :--- |
| **Encapsulation** | Private fields (`customerId` in `Customer`, internal lists in `Order`) with appropriate getters and controlled access. |
| **Inheritance (Single)** | `Customer extends Person` inheriting shared attributes like `name` and `phone`. |
| **Inheritance (Hierarchical)** | `Beverage`, `Snack`, and `Meal` all inherit from `MenuItem`. |
| **Inheritance (Multilevel)** | `SpecialMeal extends Meal` which in turn extends `MenuItem`. |
| **Abstraction** | `MenuItem` is an `abstract` class defining abstract methods `calculatePrice(int quantity)` and `getCategory()`. |
| **Polymorphism (Dynamic Method Dispatch)** | `Order.printBill()` and `WebServer` invoke `item.calculatePrice(qty)` polymorphically across subclasses at runtime. |
| **Method Overriding (`@Override`)** | Each concrete subclass implements its specific pricing formula and category string. |
| **File I/O Persistence** | `BillLogger` uses `FileWriter` in append mode (`new FileWriter("bills.txt", true)`) with timestamps without modifying existing domain classes. |

---

## 💰 Pricing & Business Rules

1. **Beverage**: Standard pricing with no tax applied (`price * quantity`).
2. **Snack**: Standard pricing plus 5% GST (`price * quantity * 1.05`).
3. **Meal**: 10% discount on total price if the customer orders 3 or more plates.
4. **SpecialMeal**: Extends `Meal` logic via `super.calculatePrice(quantity)` and adds a flat surcharge of Rs. 20 per plate.

---

## 🌐 Web Server & REST API (`WebServer.java`)

Built using Java's standard `com.sun.net.httpserver.HttpServer` on port `8080`:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/menu` | `GET` | Returns full menu as a JSON array (`id`, `name`, `price`, `category`). |
| `/api/bill` | `POST` | Receives customer details and items; calculates bill polymorphically; logs to `bills.txt` and `orders.txt`; returns itemized JSON bill. |
| `/api/orders` | `GET` | Returns all past orders from `orders.txt` as a JSON array. |
| `/api/history` | `GET` | Returns the entire raw text order log from `bills.txt`. |
| `/` | `GET` | Serves static assets from the `web/` folder with MIME detection. |

---

## 🎨 Warm Modern Canteen Web UI (`web/`)

- **Palette**: Warm Terracotta (`#B85042`), Mustard (`#E0A458`), Dark Brown (`#2A1F1A`), Soft White (`#FAF8F5`).
- **Cards**: Rounded with soft drop shadows, emoji bubbles (🍵 ☕ 🧃 🥟 🥐 🥪 🍛 🫓 🍗), and hover effects.
- **Category Tabs**: Filter by `All`, `Beverage`, `Snack`, `Meal`, or `Special Meal`.
- **Live Search**: Instant keyword filtering.
- **Cart**: In-memory JavaScript array with item count, `+` and `-` quantity controls, and rough estimates.
- **Validation**: Name and 10-digit phone checks with friendly error messages.
- **Receipt Popup**: Clean paper receipt modal with "Print Bill" (`window.print()`) and "New Order" reset.
- **Past Orders**: View previous bills loaded directly from `bills.txt`.

---

## 🚀 How to Compile and Run

### One-Click Launch (Windows)
- Double-click **`run-web.bat`** to start the web server and open the browser.
- Double-click **`run-console.bat`** to run the terminal application.

### Command Line
1. **Compile Everything**:
   ```powershell
   javac *.java
   ```
2. **Start Web Server**:
   ```powershell
   java WebServer
   ```
   Open **http://localhost:8080/** in your browser.
3. **Start Console Application**:
   ```powershell
   java CanteenSystem
   ```
