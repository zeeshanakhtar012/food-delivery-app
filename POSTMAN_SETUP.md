# Postman API Collection Setup Guide

## Quick Start

1. **Import Collection**
   - Open Postman
   - Click "Import" button
   - Select `NoteNest_RestaurantAdmin_API.postman_collection.json`
   - The collection will appear in your Postman workspace

2. **Import Environment (Optional but Recommended)**
   - Click "Import" again
   - Select `NoteNest_RestaurantAdmin_Environment.postman_environment.json`
   - Select the imported environment from the environment dropdown (top right)

3. **Update Base URL**
   - If your server runs on a different port, update the `base_url` variable
   - Default: `http://localhost:5001`

4. **Get Authentication Token**
   - Run the "Authentication > Login" request
   - Update email and password with your restaurant admin credentials
   - The token will be automatically saved to the `auth_token` variable

## Collection Structure

### 1. Authentication
- **Login**: Login as restaurant admin (auto-saves token)

### 2. Food Management
- **Create Food**: Create new food item (supports image upload)
- **Get All Foods**: List all foods for the restaurant
- **Update Food**: Update existing food item
- **Delete Food**: Soft delete a food item

### 3. Category Management
- **Create Category**: Create a new food category
- **Get All Categories**: List all categories
- **Get Category by ID**: Get specific category details
- **Update Category**: Update category information
- **Delete Category**: Delete a category (only if no foods exist in it)

### 4. Addon Management
- **Create Addon**: Create addon for a food item
- **Get Food Addons**: Get all addons for a specific food
- **Update Addon**: Update addon details
- **Delete Addon**: Delete an addon

### 5. Order Management
- **Get All Orders**: List all orders for the restaurant
- **Update Order Status**: Update order status (pending, accepted, preparing, picked_up, delivered, cancelled)

### 6. Rider Management
- **Create Rider**: Create a new rider
- **Get All Riders**: List all riders for the restaurant

### 7. Staff Management
- **Create Staff**: Create new staff member (roles: manager, cashier, chef)
- **Get All Staff**: List all staff members
- **Get Staff by ID**: Get specific staff member details
- **Update Staff**: Update staff information
- **Delete Staff**: Delete a staff member

### 8. Profile Management
- **Get Profile**: Get current restaurant admin profile
- **Update Profile**: Update profile information

### 9. Analytics
- **Get Analytics**: Get restaurant analytics (orders, revenue, averages, etc.)

## Testing Workflow

1. **First, Login**
   ```
   POST /api/admin/login
   Body: {
     "email": "your-email@restaurant.com",
     "password": "your-password"
   }
   ```
   - Token is automatically saved after login

2. **Create a Category** (required before creating foods)
   ```
   POST /api/admin/categories
   Body: {
     "name": "Pizzas",
     "description": "Delicious pizzas",
     "is_active": true
   }
   ```
   - Copy the `id` from response and set it as `category_id` variable

3. **Create a Food**
   ```
   POST /api/admin/foods
   Form-data:
   - name: "Pizza"
   - category_id: <your-category-id>
   - price: "15.99"
   - foodImages: <select file>
   ```
   - Copy the `id` from response and set it as `food_id` variable

4. **Create Addons** (optional)
   ```
   POST /api/admin/addons
   Body: {
     "food_id": "<food-id>",
     "name": "Extra Cheese",
     "price": 2.50,
     "is_required": false
   }
   ```

5. **Test Other Endpoints**
   - Use the saved variables (`{{food_id}}`, `{{category_id}}`, etc.) in requests
   - All protected endpoints automatically use `{{auth_token}}`

## Order Status Values

Valid order statuses:
- `pending` - Order just created
- `accepted` - Restaurant accepted the order
- `preparing` - Food is being prepared
- `picked_up` - Rider picked up the order
- `delivered` - Order delivered to customer
- `cancelled` - Order cancelled

## Tips

- **Variables**: After creating resources, copy IDs from responses and update environment variables for easier testing
- **File Uploads**: Use `form-data` mode for requests with file uploads (Food creation/update)
- **JSON Requests**: Use `raw` mode with `application/json` for JSON-only requests
- **Authentication**: Token expires after 8 hours - login again if you get 401 errors
- **Environment**: Switch between environments if you have different servers (dev, staging, production)

## Common Issues

1. **401 Unauthorized**: 
   - Token expired or invalid
   - Run Login request again

2. **403 Forbidden**: 
   - Restaurant account is inactive
   - No restaurant assigned to admin
   - Contact super admin

3. **404 Not Found**: 
   - Resource doesn't exist
   - Check if ID is correct

4. **400 Bad Request**: 
   - Missing required fields
   - Invalid data format
   - Check request body

5. **File Upload Errors**: 
   - Ensure file is an image
   - Max file size: 5MB
   - Use `form-data` mode, not `raw`

## Notes

- All dates/timestamps are in UTC
- Prices are in decimal format (e.g., 15.99)
- UUIDs are used for all IDs
- Soft delete is used for foods (sets is_available to false)

