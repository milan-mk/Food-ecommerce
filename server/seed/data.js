// Sample menu data shared by the seed script and the image generator.
const categories = [
  ['Burgers', 'Juicy burgers grilled to order'],
  ['Pizza', 'Hand-tossed pizzas with fresh toppings'],
  ['Sides', 'Fries, nuggets and crispy extras'],
  ['Beverages', 'Cold drinks and shakes'],
  ['Desserts', 'Sweet endings'],
  ['Combos', 'Meal deals that save you money'],
];

// [category, name, price, description, ingredients, calories, protein, carbs, fat, featured]
const products = [
  ['Burgers', 'Classic Chicken Burger', 5.99, 'Grilled chicken patty with lettuce, tomato and mayo in a toasted bun.', ['Chicken patty', 'Lettuce', 'Tomato', 'Mayo', 'Sesame bun'], 450, 28, 40, 18, true],
  ['Burgers', 'Crispy Chicken Burger', 6.49, 'Golden fried chicken fillet with spicy sauce and crunchy slaw.', ['Fried chicken fillet', 'Spicy sauce', 'Coleslaw', 'Bun'], 560, 30, 46, 27, true],
  ['Burgers', 'Cheese Burger', 5.49, 'Beef patty with melted cheddar, pickles and ketchup.', ['Beef patty', 'Cheddar', 'Pickles', 'Ketchup', 'Bun'], 520, 27, 41, 26, false],
  ['Burgers', 'Double Patty Burger', 8.99, 'Two beef patties, double cheese and our signature burger sauce.', ['Beef patty x2', 'Cheddar x2', 'Onion', 'Burger sauce', 'Bun'], 780, 45, 48, 44, true],
  ['Pizza', 'Margherita Pizza', 7.99, 'Classic tomato sauce, fresh mozzarella and basil.', ['Pizza dough', 'Tomato sauce', 'Mozzarella', 'Basil'], 620, 26, 78, 22, false],
  ['Pizza', 'Farmhouse Pizza', 9.49, 'Loaded with capsicum, onion, mushroom and sweet corn.', ['Pizza dough', 'Mozzarella', 'Capsicum', 'Onion', 'Mushroom', 'Corn'], 680, 28, 82, 25, false],
  ['Pizza', 'Chicken Tikka Pizza', 10.49, 'Tandoori chicken tikka, onions and green chillies on a cheesy base.', ['Pizza dough', 'Chicken tikka', 'Mozzarella', 'Onion', 'Green chilli'], 740, 38, 80, 28, true],
  ['Pizza', 'Cheese Burst Pizza', 11.49, 'Stuffed crust overflowing with liquid mozzarella.', ['Pizza dough', 'Mozzarella', 'Cheese blend', 'Tomato sauce'], 860, 36, 90, 38, false],
  ['Sides', 'French Fries', 2.99, 'Crispy salted fries, golden and fluffy inside.', ['Potato', 'Sunflower oil', 'Salt'], 320, 4, 41, 15, false],
  ['Sides', 'Peri Peri Fries', 3.49, 'Fries tossed in fiery peri peri seasoning.', ['Potato', 'Peri peri spice', 'Sunflower oil'], 340, 4, 42, 16, true],
  ['Sides', 'Chicken Nuggets', 4.99, 'Six crunchy chicken nuggets with a dip of your choice.', ['Chicken', 'Breadcrumbs', 'Spices'], 300, 18, 20, 17, false],
  ['Sides', 'Onion Rings', 3.29, 'Beer-battered onion rings fried until crisp.', ['Onion', 'Flour batter', 'Sunflower oil'], 280, 3, 33, 15, false],
  ['Beverages', 'Coca Cola', 1.79, 'Chilled 330 ml can.', ['Carbonated water', 'Sugar', 'Caramel colour'], 140, 0, 35, 0, false],
  ['Beverages', 'Pepsi', 1.79, 'Chilled 330 ml can.', ['Carbonated water', 'Sugar', 'Caramel colour'], 150, 0, 41, 0, false],
  ['Beverages', 'Lemonade', 2.49, 'Fresh-squeezed lemonade with a hint of mint.', ['Lemon', 'Sugar', 'Mint', 'Water'], 120, 0, 30, 0, false],
  ['Beverages', 'Cold Coffee', 3.49, 'Creamy iced coffee blended with milk and ice.', ['Coffee', 'Milk', 'Sugar', 'Ice'], 210, 6, 30, 7, false],
  ['Desserts', 'Chocolate Brownie', 3.99, 'Warm fudgy brownie with chocolate chunks.', ['Dark chocolate', 'Butter', 'Flour', 'Sugar', 'Egg'], 380, 5, 48, 19, true],
  ['Desserts', 'Ice Cream', 2.99, 'Two scoops of vanilla ice cream.', ['Milk', 'Cream', 'Sugar', 'Vanilla'], 270, 4, 31, 14, false],
  ['Desserts', 'Chocolate Shake', 4.29, 'Thick chocolate milkshake topped with cream.', ['Milk', 'Chocolate syrup', 'Ice cream'], 450, 9, 58, 20, false],
  ['Combos', 'Burger Combo', 9.99, 'Classic Chicken Burger + French Fries + Coca Cola.', ['Chicken burger', 'Fries', 'Cola'], 910, 32, 116, 33, true],
  ['Combos', 'Pizza Party Combo', 18.99, 'Margherita Pizza + Chicken Nuggets + 2 drinks.', ['Pizza', 'Nuggets', 'Drinks x2'], 1260, 48, 150, 40, false],
];

module.exports = { categories, products };
