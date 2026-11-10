# TODO List for Fixing Issues in Dapur Bunda Bahagia App

## Issue 1: Category Filtering in Customer View
- Problem: Products not displayed when selecting specific categories (Makanan, Minuman, Appetizer), but "All" works.
- Root Cause: Categories in DB are lowercase ('makanan', 'minuman', 'appetizer'), but frontend filters use capitalized strings. Exact match fails.
- Fix: Make category filter case-insensitive and trim spaces in script.js.
- Status: COMPLETED - Updated filter to use toLowerCase().trim()

## Issue 2: Checkout Process Not Working
- Problem: Cannot perform checkout process.
- Analysis: Code seems correct, tables exist in DB schema. Likely DB not properly set up or runtime errors.
- Fix: Ensure DB is restored from backup.sql. Add better error handling in frontend for checkout failure.
- Status: PARTIALLY COMPLETED - Added error handling in checkout. Ensure DB is restored.

## Issue 3: Admin Product Edit Functionality Missing
- Problem: No options to edit product name, price, image, or category in admin product list.
- Fix: Add edit button, modal/form for editing, and PUT endpoint for updating products.
- Status: COMPLETED - Added PUT /api/products/:id, edit button, modal in admin.html, and JS functions in admin.js.

### Steps to Implement Fixes

1. **Fix Category Filtering**
   - Edit script.js: Update displayMenu function to use case-insensitive comparison for categories. ✅

2. **Add Product Edit in Admin**
   - Edit server.js: Add PUT /api/products/:id endpoint for updating product details (name, price, category, image_path). ✅
   - Edit admin.html: Add edit button in product display div. ✅
   - Edit admin.js: Add editProduct function, modal/form for editing, and handle form submission to PUT endpoint. ✅

3. **Test and Verify**
   - Run server and test category filtering.
   - Test checkout process.
   - Test admin edit functionality.

4. **Additional Improvements (if needed)**
   - Ensure DB is restored: Run backup.sql if not already.
   - Add error handling for checkout in script.js.
