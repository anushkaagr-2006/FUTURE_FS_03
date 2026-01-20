'use client';

import React, { useState, useEffect } from 'react';
import { Coffee, Leaf, ShoppingBag, Menu, X, ChevronRight, MapPin, Clock, Star, LogIn, LogOut } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  imageUrl?: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  hours: string;
  emoji: string;
  imageUrl?: string;
}
interface User {
  email: string;
  displayName: string;
  rewardsPoints: number;
}

interface CartItem extends Product {
  quantity: number;
}

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showCartModal, setShowCartModal] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState<{type: 'free-drink' | 'dollar-off', amount: number} | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadData();
  }, []);
  // Load cart from localStorage on mount
useEffect(() => {
  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem('verdant-cart');
      console.log('Loading cart from localStorage:', savedCart); // Debug line
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          setCart(parsedCart);
          console.log('Cart loaded successfully:', parsedCart); // Debug line
        }
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  loadCart();
}, []);
  // Save cart to localStorage whenever it changes
useEffect(() => {
  localStorage.setItem('verdant-cart', JSON.stringify(cart));
}, [cart]);


// Listen to Firebase auth state changes
useEffect(() => {
  const setupAuthListener = async () => {
    const { auth } = await import('@/lib/firebase');
    const { onAuthStateChanged } = await import('firebase/auth');
    const { getUserData } = await import('@/lib/firebase');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userData = await getUserData(firebaseUser.uid);
        
        setUser({
          email: firebaseUser.email || '',
          displayName: userData?.displayName || firebaseUser.email?.split('@')[0] || 'User',
          rewardsPoints: userData?.rewardsPoints || 0
        });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  };

  setupAuthListener();
}, []);

  const loadData = async () => {
  setLoading(true);
  
  try {
    const { getProducts, getLocations } = await import('@/lib/firebase');
    
    const fetchedProducts = await getProducts();
    const fetchedLocations = await getLocations();
    
    setProducts(fetchedProducts as Product[]);
    setLocations(fetchedLocations as Location[]);
    setLoading(false);
  } catch (error) {
    console.error('Error loading data:', error);
    setProducts([]);
    setLocations([]);
    setLoading(false);
  }
};
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const getCartTotal = (): string => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const getCartCount = (): number => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const { signIn, signUp, createUserProfile, getUserData } = await import('@/lib/firebase');
    
    let userCredential;
    
    if (authMode === 'signin') {
      // Sign in existing user
      userCredential = await signIn(email, password);
      
      // Get their points from Firestore
      const userData = await getUserData(userCredential.user.uid);
      
      setUser({
        email: userCredential.user.email || email,
        displayName: userData?.displayName || userCredential.user.email?.split('@')[0] || 'User',
        rewardsPoints: userData?.rewardsPoints || 0
      });
    } else {
      // Create new user
      userCredential = await signUp(email, password);
      const displayName = email.split('@')[0];
      
      // Create user profile in Firestore with welcome bonus
      await createUserProfile(userCredential.user.uid, email, displayName);
      
      setUser({
        email: email,
        displayName: displayName,
        rewardsPoints: 250 // Welcome bonus!
      });
      
      alert('🎉 Welcome! You received 250 bonus points!');
    }
    
    setShowAuthModal(false);
  } catch (error: any) {
    alert('❌ Error: ' + error.message);
  }
};
  const handleSignOut = async () => {
  try {
    const { signOut } = await import('@/lib/firebase');
    await signOut();
    setUser(null);
    setCart([]);
    localStorage.removeItem('verdant-cart');
    alert('✅ Signed out successfully!');
  } catch (error: any) {
    alert('❌ Error signing out: ' + error.message);
  }
};
const removeFromCart = (productId: string) => {
  setCart(prev => prev.filter(item => item.id !== productId));
};

const getDiscountedTotal = (): { original: string, discount: string, final: string } => {
  const originalTotal = parseFloat(getCartTotal());
  let discountAmount = 0;
  
  if (activeDiscount) {
    if (activeDiscount.type === 'free-drink') {
      // Find most expensive item in cart
      const maxPrice = Math.max(...cart.map(item => item.price));
      discountAmount = maxPrice;
    } else if (activeDiscount.type === 'dollar-off') {
      discountAmount = Math.min(activeDiscount.amount, originalTotal);
    }
  }
  
  const finalTotal = Math.max(0, originalTotal - discountAmount);
  
  return {
    original: originalTotal.toFixed(2),
    discount: discountAmount.toFixed(2),
    final: finalTotal.toFixed(2)
  };
};

const updateQuantity = (productId: string, newQuantity: number) => {
  if (newQuantity === 0) {
    removeFromCart(productId);
  } else {
    setCart(prev => prev.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  }
};
  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#2C3D2F]">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#F5F1E8] bg-opacity-95 shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm">
  <img 
    src="/images/verdant-logo.png" 
    alt="Verdant Coffee Logo" 
    className="h-8 w-auto object-contain"
  />
</div>
              <span className="text-2xl font-bold">Verdant</span>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <a href="#menu" className="hover:text-[#B9855B] transition-colors">Menu</a>
              <a href="#locations" className="hover:text-[#B9855B] transition-colors">Locations</a>
              <a href="#rewards" className="hover:text-[#B9855B] transition-colors">Rewards</a>
              
              <button 
  onClick={() => setShowCartModal(true)}
  className="relative hover:text-[#B9855B]"
>
  <ShoppingBag className="w-6 h-6" />
  {getCartCount() > 0 && (
    <span className="absolute -top-2 -right-2 bg-[#B9855B] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
      {getCartCount()}
    </span>
  )}
</button>

              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm">Hi, {user.displayName}!</span>
                  <button onClick={handleSignOut} className="hover:text-[#B9855B]">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="bg-[#2C3D2F] text-white px-6 py-2 rounded-full hover:bg-[#4A6650] flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-20 px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block bg-[#2C3D2F] bg-opacity-5 px-4 py-2 rounded-full">
                <span className="text-sm font-medium">✨ New Season Collection</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-bold leading-tight">
                Where Nature<br /><span className="text-[#B9855B]">Meets Craft</span>
              </h1>
              <p className="text-xl opacity-80">
  Chennai's First Urban Garden Coffee House. Where Every Cup Plants a Tree.
</p>
              <div className="flex gap-4">
                <a href="#menu" className="bg-[#2C3D2F] text-white px-8 py-4 rounded-full hover:bg-[#4A6650] flex items-center space-x-2">
                  <span>Explore Menu</span>
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-2xl relative">
  <img 
    src="/images/hero-image.jpg" 
    alt="Verdant Coffee Shop" 
    className="w-full h-96 object-cover"
  />
  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-8">
    <p className="text-center text-xl font-bold text-white">Crafted with Purpose</p>
  </div>
  </div>
  </div>
        </div>
      </section>

      {/* About Section */}
<section className="py-20 px-6 bg-white">
  <div className="max-w-4xl mx-auto text-center space-y-6">
    <h2 className="text-5xl font-bold text-[#2C3D2F]">Our Story</h2>
    <p className="text-xl text-gray-700 leading-relaxed">
      Verdant Coffee Co. was born from a vision to reimagine coffee culture 
      in Chennai. We blend traditional Indian hospitality with modern 
      sustainability practices, creating a space where nature meets craft.
    </p>
    <p className="text-lg text-gray-600">
      Every bean is ethically sourced. Every cup is thoughtfully crafted. 
      Every visit plants a tree.
    </p>
  </div>
</section>

      {/* Products */}
      <section id="menu" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-4">Signature Collection</h2>
            <p className="text-xl opacity-70">Handcrafted beverages, mindfully sourced</p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-12 h-12 border-4 border-[#2C3D2F] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
                  <div className="h-48 bg-gradient-to-br from-[#B9855B] from-opacity-20 to-[#2C3D2F] to-opacity-20 flex items-center justify-center overflow-hidden">
  {product.imageUrl ? (
    <img 
      src={product.imageUrl} 
      alt={product.name}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="text-7xl">{product.emoji}</div>
  )}
</div>
                  <div className="p-6 space-y-3">
                    <div className="text-xs font-medium text-[#B9855B] uppercase">{product.category}</div>
                    <h3 className="text-2xl font-semibold">{product.name}</h3>
                    <p className="text-sm opacity-70">{product.description}</p>
                    <div className="flex justify-between items-center pt-4">
                      <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
                      <button onClick={() => addToCart(product)} className="bg-[#2C3D2F] text-white px-4 py-2 rounded-full hover:bg-[#4A6650]">
                        Add to Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Rewards */}
<section id="rewards" className="py-20 bg-gradient-to-br from-[#2C3D2F] to-[#4A6650] text-white px-6">
  <div className="max-w-7xl mx-auto">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className="space-y-6">
        <h2 className="text-5xl font-bold">Rewards Reimagined</h2>
        <p className="text-lg opacity-80">Every sip brings you closer to exclusive benefits.</p>
        {!user && (
          <button onClick={() => setShowAuthModal(true)} className="bg-white text-[#2C3D2F] px-8 py-4 rounded-full hover:bg-opacity-90">
            Join Now
          </button>
        )}
      </div>
      {user && (
        <div className="bg-white bg-opacity-10 rounded-3xl p-8 border border-white border-opacity-20">
          <div className="text-center space-y-6">
            <div className="text-6xl">🎁</div>
            <h3 className="text-3xl font-bold">{user.rewardsPoints} Points</h3>
            <p className="opacity-80">Your Balance</p>
            
            <div className="space-y-3 mt-6">
              <button
                onClick={async () => {
  if (user.rewardsPoints >= 100) {
    const { auth } = await import('@/lib/firebase');
    const { redeemPoints } = await import('@/lib/firebase');
    
    if (auth.currentUser) {
      const result = await redeemPoints(auth.currentUser.uid, 100);
      if (result.success) {
        setUser(prev => prev ? { 
          ...prev, 
          rewardsPoints: result.newTotal ?? 0 
        } : null);
        setActiveDiscount({ type: 'free-drink', amount: 7.25 }); // Max drink price
        alert('🎉 100 points redeemed!\n\nYou have 1 FREE DRINK!\nAdd any drink to cart and checkout - the most expensive drink will be free!');
      }
    }
  } else {
    alert('❌ You need 100 points for a free drink. Keep shopping!');
  }
}}
                className="w-full bg-white text-[#2C3D2F] px-6 py-2 rounded-full hover:bg-opacity-90 text-sm font-medium"
              >
                Redeem 100pts → Free Drink
              </button>
              
              <button
                onClick={async () => {
  if (user.rewardsPoints >= 500) {
    const { auth } = await import('@/lib/firebase');
    const { redeemPoints } = await import('@/lib/firebase');
    
    if (auth.currentUser) {
      const result = await redeemPoints(auth.currentUser.uid, 500);
      if (result.success) {
        setUser(prev => prev ? { 
          ...prev, 
          rewardsPoints: result.newTotal ?? 0 
        } : null);
        setActiveDiscount({ type: 'dollar-off', amount: 10 });
        alert('🎉 500 points redeemed!\n\nYou have $10 OFF your next order!\nCheckout to apply the discount!');
      }
    }
  } else {
    alert('❌ You need 500 points for $10 off. Current: ' + user.rewardsPoints);
  }
}}
                className="w-full bg-white text-[#2C3D2F] px-6 py-2 rounded-full hover:bg-opacity-90 text-sm font-medium"
              >
                Redeem 500pts → $10 Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
</section>

      {/* Locations */}
      <section id="locations" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Find Your Haven</h2>
            <p className="text-xl opacity-70">Discover a Verdant location near you</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {locations.map((location) => (
              <div key={location.id} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-full h-32 bg-gradient-to-br from-[#B9855B] from-opacity-20 to-[#2C3D2F] to-opacity-20 rounded-xl overflow-hidden mb-4">
  {location.imageUrl ? (
    <img 
      src={location.imageUrl} 
      alt={location.name}
      className="w-full h-full object-cover"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-5xl">
      {location.emoji}
    </div>
  )}
</div>
                <h3 className="text-2xl font-semibold mb-3">{location.name}</h3>
                <div className="space-y-2 text-sm opacity-70">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 mt-1" />
                    <span>{location.address}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{location.hours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2C3D2F] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm">
  <img 
    src="/images/verdant-logo.png" 
    alt="Verdant Coffee" 
    className="h-8 w-auto object-contain"
  />
</div>
            <span className="text-xl font-bold">Verdant</span>
          </div>
          <p className="text-sm opacity-60">© 2026 Verdant Coffee Co. | Full-Stack Rebrand Project</p>
          {/* Cart Modal */}
{showCartModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-[#2C3D2F]">Your Cart</h3>
        <button onClick={() => setShowCartModal(false)} className="text-[#2C3D2F]">
          <X className="w-6 h-6" />
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Your cart is empty</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
  <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
    {item.imageUrl ? (
      <img 
        src={item.imageUrl} 
        alt={item.name}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-2xl">
        {item.emoji}
      </div>
    )}
  </div>
  <div className="flex-1">
    <h4 className="font-bold text-[#2C3D2F] text-lg">{item.name}</h4>
    <p className="text-sm text-gray-600">${item.price.toFixed(2)}</p>
  </div>
                <div className="flex items-center gap-2">
                  <button
  onClick={() => updateQuantity(item.id, item.quantity - 1)}
  className="w-8 h-8 rounded-full bg-[#2C3D2F] text-white hover:bg-[#4A6650] flex items-center justify-center font-bold"
>
  -
</button>
<span className="w-8 text-center font-bold text-[#2C3D2F]">{item.quantity}</span>
<button
  onClick={() => updateQuantity(item.id, item.quantity + 1)}
  className="w-8 h-8 rounded-full bg-[#2C3D2F] text-white hover:bg-[#4A6650] flex items-center justify-center font-bold"
>
  +
</button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
  {activeDiscount && (
    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
        🎁 Active Reward
      </div>
      <div className="text-sm text-green-600">
        {activeDiscount.type === 'free-drink' 
          ? '1 Free Drink (most expensive item)'
          : `$${activeDiscount.amount} Off`
        }
      </div>
    </div>
  )}
  
  <div className="space-y-2 mb-4">
    {activeDiscount && (
      <>
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span>${getDiscountedTotal().original}</span>
        </div>
        <div className="flex justify-between text-green-600 font-semibold">
          <span>Discount:</span>
          <span>-${getDiscountedTotal().discount}</span>
        </div>
      </>
    )}
    <div className="flex justify-between items-center">
      <span className="text-lg font-semibold">Total:</span>
      <span className="text-2xl font-bold text-[#2C3D2F]">
        ${activeDiscount ? getDiscountedTotal().final : getCartTotal()}
      </span>
    </div>
  </div>
  
            <button 
  onClick={async () => {
  const totals = getDiscountedTotal();
  const total = activeDiscount ? parseFloat(totals.final) : parseFloat(getCartTotal());
  const originalTotal = parseFloat(totals.original);
  const savedAmount = activeDiscount ? parseFloat(totals.discount) : 0;
    
    if (user) {
      try {
        const { auth } = await import('@/lib/firebase');
        const { addPurchasePoints } = await import('@/lib/firebase');
        
        if (auth.currentUser) {
          // Add points based on purchase
          const result = await addPurchasePoints(auth.currentUser.uid, total);
          
          if (result) {
            // Update local user state
            setUser(prev => prev ? { 
              ...prev, 
              rewardsPoints: result.newTotal ?? 0 
            } : null);
            // Clear discount after use
setActiveDiscount(null);
            
            // Clear cart
            setCart([]);
            setShowCartModal(false);
            
            // Show success message
            setTimeout(() => {
              alert(`🎉 Order Placed Successfully!\n\n${
  activeDiscount 
    ? `Original: $${originalTotal}\nDiscount: -$${savedAmount}\nTotal Paid: $${total}`
    : `Total: $${total}`
}\n✨ You earned ${result.pointsAdded} points!\n\nNew Points Balance: ${result.newTotal} points`);
            }, 100);
          } else {
            setCart([]);
            setShowCartModal(false);
            setTimeout(() => {
              alert(`✅ Order placed! Total: $${total}`);
            }, 100);
          }
        } else {
          setCart([]);
          setShowCartModal(false);
          setTimeout(() => {
            alert(`✅ Order placed! Total: $${total}`);
          }, 100);
        }
      } catch (error) {
        console.error('Error adding points:', error);
        setCart([]);
        setShowCartModal(false);
        setTimeout(() => {
          alert(`✅ Order placed! Total: $${total}\n\n(Note: Points couldn't be added)`);
        }, 100);
      }
    } else {
      setCart([]);
      setShowCartModal(false);
      setTimeout(() => {
        alert(`✅ Order placed! Total: $${total}\n\nSign in to earn rewards points!`);
      }, 100);
    }
  }}
  className="w-full bg-[#2C3D2F] text-white py-3 rounded-full hover:bg-[#4A6650] font-medium"
>
  Checkout
</button>
          </div>
        </>
      )}
    </div>
  </div>
)}
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#2C3D2F]">
                {authMode === 'signin' ? 'Welcome Back' : 'Join Verdant'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="text-[#2C3D2F]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input type="email" name="email" required className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:border-[#2C3D2F]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input type="password" name="password" required className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:border-[#2C3D2F]" />
              </div>
              <button type="submit" className="w-full bg-[#2C3D2F] text-white py-3 rounded-full hover:bg-[#4A6650]">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            <div className="mt-4 text-center">
  <button
    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
    className="text-sm text-gray-600 hover:text-[#B9855B] transition-colors"
  >
    {authMode === 'signin' 
      ? "Don't have an account? Sign up" 
      : "Already have an account? Sign in"
    }
  </button>
</div>
          </div>
        </div>
      )}

      {/* Cart Badge */}
      {getCartCount() > 0 && (
  <div className="fixed bottom-6 right-6 z-40">
    <button 
      onClick={() => setShowCartModal(true)}
      className="bg-[#2C3D2F] text-white rounded-full shadow-2xl p-4 hover:bg-[#4A6650] transition-colors"
    >
      <div className="flex items-center space-x-3">
        <ShoppingBag className="w-6 h-6" />
        <div>
          <div className="text-sm">{getCartCount()} items</div>
          <div className="text-lg font-bold">${getCartTotal()}</div>
        </div>
      </div>
    </button>
  </div>
)}
    </div>
  );
}