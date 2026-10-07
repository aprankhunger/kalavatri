import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    // Load initial cart from local storage if available
    const savedCart = localStorage.getItem('kalavatri_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Save to local storage whenever cart changes
  useEffect(() => {
    localStorage.setItem('kalavatri_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, quantity, size, color) => {
    setCartItems(prev => {
      // Check if item with same id, size, and color already exists
      const existingItemIndex = prev.findIndex(
        item => item._id === product._id && item.size === size && item.color === color
      );

      if (existingItemIndex > -1) {
        // Update quantity (avoid mutating the existing object for StrictMode)
        const newCart = [...prev];
        const currentItem = newCart[existingItemIndex];
        newCart[existingItemIndex] = { ...currentItem, quantity: currentItem.quantity + quantity };
        return newCart;
      }

      // Add new item
      return [...prev, { ...product, quantity, size, color }];
    });
  };

  const updateQuantity = (index, delta) => {
    setCartItems(prev => {
      const newCart = [...prev];
      const currentItem = newCart[index];
      const newQuantity = currentItem.quantity + delta;
      
      if (newQuantity > 0) {
        newCart[index] = { ...currentItem, quantity: newQuantity };
      }
      return newCart;
    });
  };

  const removeFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const isInCart = (productId) => cartItems.some((item) => item._id === productId);

  return (
    <CartContext.Provider value={{
      cartItems,
      isInCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartTotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
