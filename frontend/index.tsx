import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import {
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Camera,
  Dog,
  Cat,
  Bird,
  Rat,
  Sparkles,
  X,
  PawPrint,
  Info,
  ArrowUpDown,
  Moon,
  Sun,
  Grid,
  List,
  Share2,
  Printer,
  Siren,
  Flag,
  Send,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  User,
  LogOut,
  Mail,
  Lock,
  ChevronRight,
  Pencil,
  Trash2,
  LayoutDashboard,
  Home
} from "lucide-react";

// --- Types ---
type PetType = "Dog" | "Cat" | "Bird" | "Rat" | "Other";
type SortOption = "Newest" | "Oldest" | "Age" | "Name" | "Urgency";
type FilterType = PetType | "All" | "Favorites" | "Urgent";
type ViewMode = "grid" | "list";
type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";
type PetStatus = "Available" | "Adopted" | "Fostered";
type AppView = "feed" | "profile";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt: Date;
}

interface Comment {
  id: string;
  text: string;
  createdAt: Date;
  author: string;
}

interface Pet {
  id: string;
  name: string;
  type: PetType;
  age: string;
  location: string;
  distance: number; // km from user (mock)
  description: string;
  imageUrl: string;
  imageData?: string | null;
  imageType?: string | null;
  contactNumber: string;
  postedAt: Date;
  urgency: UrgencyLevel;
  status: PetStatus;
  donationUrl?: string;
  traits: string; // Added for edit form population
  comments: Comment[];
  cheers: number;
  authorId?: string; // ID of user who posted
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// --- Mock Data ---
const DEMO_USER_ID = "u_demo_123";

const INITIAL_PETS: Pet[] = [
  {
    id: "1",
    name: "Rusty",
    type: "Dog",
    age: "2 years",
    location: "Downtown Market Area",
    distance: 1.2,
    description: "Rusty is a gentle soul who loves watching people pass by. He's a bit shy at first but wags his tail furiously once he knows you have a biscuit. Needs a safe yard.",
    imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800",
    contactNumber: "15550001234",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    urgency: "Medium",
    status: "Available",
    comments: [],
    cheers: 5,
    traits: "gentle, shy, food-motivated",
    authorId: DEMO_USER_ID // Assigned to demo user for testing
  },
  {
    id: "2",
    name: "Luna",
    type: "Cat",
    age: "6 months",
    location: "Greenwood Park Entrance",
    distance: 3.5,
    description: "Found this little energetic kitten near the park benches. She is fearless, playful, and loves chasing leaves. Very clean and healthy.",
    imageUrl: "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&q=80&w=800",
    contactNumber: "15550005678",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    urgency: "Low",
    status: "Adopted",
    comments: [{ id: "c1", text: "So happy she found a home!", author: "Neighbor", createdAt: new Date() }],
    cheers: 24,
    traits: "playful, energetic, clean",
    authorId: "u_other_999"
  },
  {
    id: "3",
    name: "Pip",
    type: "Bird",
    age: "Unknown",
    location: "High Street Rooftops",
    distance: 0.5,
    description: "A tame pigeon who seems lost. He has a little band on his leg but no owner found. Very friendly and lands on shoulders.",
    imageUrl: "https://tse1.mm.bing.net/th/id/OIP.YHDK3tzxMyNYdC6WflR3cwHaIo?pid=Api&P=0&h=180",
    contactNumber: "15550009012",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    urgency: "High",
    status: "Available",
    comments: [],
    cheers: 2,
    traits: "tame, lost, friendly",
    authorId: DEMO_USER_ID
  },
  {
    id: "4",
    name: "Buster",
    type: "Dog",
    age: "Old",
    location: "Industrial Zone",
    distance: 8.2,
    description: "Senior dog found wandering near the warehouses. Looks malnourished and has a slight limp. Needs immediate medical attention.",
    imageUrl: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=800",
    contactNumber: "15550009999",
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
    urgency: "Critical",
    status: "Available",
    donationUrl: "https://paypal.me/mockdonation",
    comments: [],
    cheers: 12,
    traits: "senior, calm, needs help",
    authorId: "u_other_999"
  },
];

// --- Helpers ---
const getAgeInMonths = (ageStr: string): number => {
  const str = ageStr.toLowerCase();
  const numMatch = str.match(/(\d+(\.\d+)?)/);
  if (!numMatch) return 999;
  const num = parseFloat(numMatch[0]);
  if (str.includes("year") || str.includes("yr")) return num * 12;
  if (str.includes("month") || str.includes("mo")) return num;
  if (str.includes("week") || str.includes("wk")) return num / 4;
  return num;
};

const urgencyScore = (u: UrgencyLevel) => {
  switch (u) {
    case "Critical": return 4;
    case "High": return 3;
    case "Medium": return 2;
    case "Low": return 1;
    default: return 0;
  }
};

// Normalize incoming pet objects from the backend to ensure fields we rely on exist
const normalizePet = (p: any): Pet => {
  return {
    id: String(p.id || p._id || Math.random().toString(36).substr(2, 9)),
    name: p.name || "",
    type: (p.type as PetType) || "Other",
    age: p.age || "",
    location: p.location || "",
    distance: typeof p.distance === 'number' ? p.distance : (p.distance ? Number(p.distance) : Math.random() * 10),
    description: p.description || "",
    imageUrl: p.imageUrl || "",
    imageData: (p as any).imageData ?? null,
    imageType: (p as any).imageType ?? null,
    contactNumber: p.contactNumber || "",
    postedAt: p.postedAt ? new Date(p.postedAt) : new Date(),
    urgency: (p.urgency as UrgencyLevel) || "Medium",
    status: (p.status as PetStatus) || "Available",
    donationUrl: p.donationUrl || undefined,
    traits: p.traits || "",
    comments: Array.isArray(p.comments) ? p.comments : [],
    cheers: typeof p.cheers === 'number' ? p.cheers : (p.cheers ? Number(p.cheers) : 0),
    authorId: p.authorId || p.author?._id || p.author?.id || undefined,
  } as Pet;
}
// --- Main Component ---

function App() {
  const [pets, setPets] = useState<Pet[]>(INITIAL_PETS);
  const [currentView, setCurrentView] = useState<AppView>("feed");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<String | null>(() => localStorage.getItem('streetpaws_token'));
  
  // Filter/Sort States
  const [selectedType, setSelectedType] = useState<FilterType>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  
  // UI States
  const [darkMode, setDarkMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [posterPet, setPosterPet] = useState<Pet | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Theme & Auth Init
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Load pets from backend if available
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://streetpaws-backend-production.up.railway.app/api/pets');
        if (res.ok) {
          const json = await res.json();
          if (json?.pets) setPets(json.pets.map((p: any) => normalizePet(p)));
        }
      } catch (err) {
        console.warn('Could not load pets from backend', err);
      }
    })();
  }, []);

  useEffect(() => {
    const savedUserRaw = localStorage.getItem("streetpaws_user");
    const savedToken = localStorage.getItem("streetpaws_token");
    if (savedUserRaw) {
      try {
        const parsed = JSON.parse(savedUserRaw);
        // Ensure joinedAt is a Date instance (localStorage stores strings)
        if (parsed && parsed.joinedAt) parsed.joinedAt = new Date(parsed.joinedAt);
        setCurrentUser(parsed);
      } catch (e) {
        console.warn('Failed to parse saved user', e);
        localStorage.removeItem('streetpaws_user');
      }
    }
    if (savedToken) setToken(savedToken);
  }, []);

  const handleLogin = (user: any) => {
    // user may come with token and optional profile image fields from server
    const avatar = user.profileImageData && user.profileImageType ? `data:${user.profileImageType};base64,${user.profileImageData}` : (user.profileImageUrl || user.avatar || null);
    const savedUser = { id: String(user.id), name: user.name, email: user.email, joinedAt: user.joinedAt ? new Date(user.joinedAt) : new Date(), avatar };
    setCurrentUser(savedUser);
    if (user.token) { setToken(user.token); localStorage.setItem('streetpaws_token', user.token); }
    localStorage.setItem("streetpaws_user", JSON.stringify(savedUser));
    // auth UI removed; no-op
    addToast(`Welcome back, ${user.name || user.email}!`, "success");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem("streetpaws_user");
    localStorage.removeItem('streetpaws_token');
    setCurrentView("feed");
    addToast("Logged out successfully.", "info");
  };

  // Update the logged-in user's profile (name, email, optionally password)
  const handleUpdateProfile = async (updates: { name?: string; email?: string; password?: string }) => {
    if (!token) { addToast('Not logged in; profile updates require login.', 'info'); return null; }
    try {
      const res = await fetch('https://streetpaws-backend-production.up.railway.app/api/me', { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast(err?.error || 'Failed to update profile', 'error');
        return null;
      }
      const json = await res.json();
      // Update in-app state + localStorage
      const avatar = json.user.profileImageData && json.user.profileImageType ? `data:${json.user.profileImageType};base64,${json.user.profileImageData}` : (json.user.profileImageUrl || null);
      const saved = { id: String(json.user.id), name: json.user.name, email: json.user.email, joinedAt: json.user.joinedAt ? new Date(json.user.joinedAt) : new Date(), avatar };
      setCurrentUser(saved);
      localStorage.setItem('streetpaws_user', JSON.stringify(saved));
      addToast('Profile updated', 'success');
      return json.user;
    } catch (e) {
      console.error('Profile update failed', e);
      addToast('Failed to update profile', 'error');
      return null;
    }
  };

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("streetpaws_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addToast = (message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const toggleFavorite = (petId: string) => {
    setFavorites((prev) => {
      const newFavs = prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId];
      localStorage.setItem("streetpaws_favorites", JSON.stringify(newFavs));
      return newFavs;
    });
    addToast(favorites.includes(petId) ? "Removed from favorites" : "Added to favorites", "success");
  };

  const updatePet = (petId: string, updates: Partial<Pet>) => {
    setPets(pets.map(p => p.id === petId ? { ...p, ...updates } : p));
  };

  const handleAddComment = (petId: string, text: string) => {
    const authorName = currentUser ? currentUser.name : 'Guest';
    const newComment: Comment = {
      id: Math.random().toString(36),
      text,
      author: authorName,
      createdAt: new Date(),
    };
    const existingComments = pets.find(p => p.id === petId)?.comments || [];
    updatePet(petId, { comments: [...existingComments, newComment] });
    addToast("Note added!", "success");
  };

  const handleCheer = (petId: string) => {
    const pet = pets.find(p => p.id === petId);
    if (pet) updatePet(petId, { cheers: pet.cheers + 1 });
  };

  const handleStatusChange = (petId: string, status: PetStatus) => {
     updatePet(petId, { status });
     addToast(`Status updated to ${status}`, "success");
  }

  // Filtering & Sorting
  const filteredPets = pets.filter((pet) => {
    const matchesType =
      selectedType === "All" ? true :
      selectedType === "Favorites" ? favorites.includes(pet.id) :
      selectedType === "Urgent" ? (pet.urgency === "High" || pet.urgency === "Critical") :
      pet.type === selectedType;

    const matchesSearch =
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesSearch;
  });

  const sortedAndFilteredPets = [...filteredPets].sort((a, b) => {
    if (a.status === "Adopted" && b.status !== "Adopted") return 1;
    if (b.status === "Adopted" && a.status !== "Adopted") return -1;

    if (sortBy === "Newest") return b.postedAt.getTime() - a.postedAt.getTime();
    if (sortBy === "Oldest") return a.postedAt.getTime() - b.postedAt.getTime();
    if (sortBy === "Name") return a.name.localeCompare(b.name);
    if (sortBy === "Age") return getAgeInMonths(a.age) - getAgeInMonths(b.age);
    if (sortBy === "Urgency") return urgencyScore(b.urgency) - urgencyScore(a.urgency);
    return 0;
  });

  // Modal Handlers
  const openListStrayModal = () => {
    // allow listing without login (guest users)
    setEditingPet(null);
    setIsModalOpen(true);
  };

  const openEditPetModal = (pet: Pet) => {
    setEditingPet(pet);
    setIsModalOpen(true);
  };

  const handleDeletePet = (petId: string) => {
    if (window.confirm("Are you sure you want to delete this listing? This cannot be undone.")) {
      setPets(prev => prev.filter(p => p.id !== petId));
      addToast("Listing deleted successfully.", "success");
    }
  };

  const handleSavePet = async (petData: Pet) => {
    try {
      if (editingPet) {
        // update existing
        if (token) {
          const res = await fetch(`https://streetpaws-backend-production.up.railway.app/api/pets/${editingPet.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(petData) });
          if (res.ok) {
            const json = await res.json();
            setPets(prev => prev.map(p => p.id === json.pet.id ? normalizePet(json.pet) : p));
            addToast('Pet details updated!', 'success');
          } else {
            const err = await res.json().catch(() => ({}));
            addToast(err?.error || 'Failed to update pet', 'error');
          }
        } else {
          setPets(prev => prev.map(p => p.id === petData.id ? petData : p));
          addToast('Pet details updated!', 'success');
        }
      } else {
        // create new pet: always POST to server; include Authorization header when present
        try {
          const headers: any = { 'content-type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token}`;
          const res = await fetch('https://streetpaws-backend-production.up.railway.app/api/pets', { method: 'POST', headers, body: JSON.stringify(petData) });
          if (res.ok) {
            const json = await res.json();
            setPets(prev => [normalizePet(json.pet), ...prev]);
            addToast('Pet listed successfully!', 'success');
          } else {
            const err = await res.json().catch(() => ({}));
            addToast(err?.error || 'Failed to create pet; saved locally', 'error');
            setPets(prev => [petData, ...prev]);
          }
        } catch (e) {
          console.error('Create pet failed', e);
          addToast('Failed to reach server; saved locally', 'error');
          setPets(prev => [petData, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error saving pet', err);
      addToast('Failed to save pet', 'error');
    } finally {
      setIsModalOpen(false);
      setEditingPet(null);
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? "bg-stone-900 text-stone-100" : "bg-stone-50 text-stone-800"}`}>
      
      {/* Toast Container */}
      <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-right-10 ${
            toast.type === "success" ? "bg-green-500 text-white" : "bg-stone-800 text-white"
          }`}>
            {toast.type === "success" && <CheckCircle2 size={16} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className={`border-b shadow-sm transition-colors ${darkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => setCurrentView("feed")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-sm">
              <PawPrint size={22} />
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${darkMode ? "text-stone-100" : "text-stone-800"}`}>
              Street<span className="text-amber-500">Paws</span>
            </h1>
          </button>
          
          <div className="flex items-center gap-3">
             <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${darkMode ? "bg-stone-800 text-amber-400 hover:bg-stone-700" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-200 ml-2">
                <button 
                  onClick={() => setCurrentView("profile")}
                  className={`flex items-center gap-2 px-2 py-1 rounded-full transition-all ${
                    currentView === 'profile' 
                      ? (darkMode ? "bg-stone-800" : "bg-stone-100") 
                      : "hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold leading-tight max-w-[80px] truncate">{currentUser.name}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold">{currentUser.name.charAt(0)}</div>
                    )}
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { addToast('No login required — you can view and list pets as a guest.', 'info'); }}
                className={`text-sm font-bold px-4 py-2 rounded-full transition-colors ${darkMode ? "text-stone-300 hover:text-white" : "text-stone-600 hover:text-stone-900"}`}
              >
                Guest
              </button>
            )}

            <button
              onClick={openListStrayModal}
              className="bg-amber-600 text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-amber-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">List Stray</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {currentView === "feed" ? (
        <>
          {/* Hero */}
          <div className={`py-12 px-4 border-b transition-colors ${darkMode ? "bg-stone-800 border-stone-700" : "bg-amber-100/50 border-amber-100"}`}>
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className={`text-3xl md:text-5xl font-extrabold tracking-tight leading-tight ${darkMode ? "text-white" : "text-stone-800"}`}>
                Every street friend deserves a <span className="text-amber-500">home</span>.
              </h2>
              <p className={`text-lg max-w-2xl mx-auto ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
                Connect with your community to adopt, foster, and care for local animals.
              </p>
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 py-8">
            {/* Toolbar */}
              <div className="flex flex-col lg:flex-row gap-4 mb-8 justify-between items-center py-3 bg-opacity-95 rounded-xl transition-all">
              
              <div className="flex gap-2 overflow-x-auto pb-2 w-full lg:w-auto no-scrollbar mask-gradient">
                {["All", "Favorites", "Urgent", "Dog", "Cat", "Bird", "Other"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type as FilterType)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-2 ${
                      selectedType === type
                        ? "bg-amber-500 text-white border-amber-500"
                        : darkMode 
                          ? "bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700"
                          : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {type === "Favorites" && <Heart size={14} className={selectedType === "Favorites" ? "fill-white" : ""} />}
                    {type === "Urgent" && <Siren size={14} />}
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
                {/* View Toggle */}
                <div className={`flex items-center p-1 rounded-lg border ${darkMode ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200"}`}>
                    <button 
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-md transition-all ${viewMode === "grid" ? (darkMode ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-900") : "text-stone-400"}`}
                    >
                      <Grid size={18} />
                    </button>
                    <button 
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-all ${viewMode === "list" ? (darkMode ? "bg-stone-700 text-white" : "bg-stone-100 text-stone-900") : "text-stone-400"}`}
                    >
                      <List size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 sm:w-64 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search location or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm ${
                      darkMode ? "bg-stone-800 border-stone-700 text-white placeholder-stone-500" : "bg-white border-stone-200 text-stone-800 placeholder-stone-400"
                    }`}
                  />
                </div>

                {/* Sort */}
                <div className="relative shrink-0 w-full sm:w-auto">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className={`w-full sm:w-auto pl-4 pr-10 py-2.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm font-medium appearance-none cursor-pointer ${
                      darkMode ? "bg-stone-800 border-stone-700 text-white" : "bg-white border-stone-200 text-stone-600"
                    }`}
                  >
                    <option value="Newest">Newest</option>
                    <option value="Oldest">Oldest</option>
                    <option value="Urgency">Urgency</option>
                    <option value="Age">Youngest</option>
                    <option value="Name">Name</option>
                  </select>
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
              </div>
            </div>

            {/* Feed */}
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {sortedAndFilteredPets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  darkMode={darkMode}
                  viewMode={viewMode}
                  currentUser={currentUser}
                  isFavorite={favorites.includes(pet.id)}
                  onToggleFavorite={() => toggleFavorite(pet.id)}
                  onGeneratePoster={() => setPosterPet(pet)}
                  onAddComment={handleAddComment}
                  onCheer={handleCheer}
                  onStatusChange={handleStatusChange}
                  onReport={() => addToast("Listing reported to moderation team.", "info")}
                  isOwner={false} // In feed view, regular behavior
                />
              ))}
            </div>
            
            {sortedAndFilteredPets.length === 0 && (
                <div className={`py-20 text-center rounded-3xl border border-dashed ${darkMode ? "border-stone-700 text-stone-500" : "border-stone-200 text-stone-400"}`}>
                  <p className="text-xl font-medium">No pets found matching your criteria.</p>
                </div>
            )}
          </main>
        </>
      ) : (
        /* Profile View */
        <ProfileView 
           currentUser={currentUser!} 
           pets={pets} 
           darkMode={darkMode}
           onEdit={openEditPetModal}
           onDelete={handleDeletePet}
           onBack={() => setCurrentView("feed")}
           onLogout={handleLogout}
           onToggleFavorite={toggleFavorite}
           favorites={favorites}
           setPosterPet={setPosterPet}
           handleAddComment={handleAddComment}
           handleCheer={handleCheer}
           handleStatusChange={handleStatusChange}
            onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Floating Chat Bot */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        >
          {isChatOpen ? <X size={24} /> : <Stethoscope size={24} />}
        </button>
      </div>
      
      {isChatOpen && (
        <AIChatBot onClose={() => setIsChatOpen(false)} darkMode={darkMode} />
      )}

      {/* Modals */}
      {isModalOpen && (
        <PetFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSavePet}
          darkMode={darkMode}
          currentUser={currentUser}
          initialData={editingPet || undefined}
        />
      )}
      
      {posterPet && (
        <PosterModal 
          pet={posterPet} 
          onClose={() => setPosterPet(null)} 
        />
      )}

      {/* Auth removed: guest users can view and list pets without signing in */}
      {/* Footer */}
      <footer className={`mt-12 border-t pt-6 pb-8 ${darkMode ? "border-stone-800 text-stone-400" : "border-stone-200 text-stone-600"}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Heart size={18} className="text-amber-500" />
            <span>Developed with <span className="text-amber-500">♥</span> by <span className="font-semibold">Gopal Patel</span></span>
          </div>

          <div className="text-sm text-center sm:text-left">
            <div className="">Address: Lucknow</div>
          </div>

          <div className="text-sm text-center sm:text-right">
            <div>Contact: <a href="tel:7905013678" className="text-amber-500 font-medium">7905013678</a></div>
            <div>Email: <a href="mailto:patelgopal563@gmail.com" className="text-amber-500 font-medium">patelgopal563@gmail.com</a></div>
            <div className="text-xs text-stone-400 mt-1">Available for personal website development</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Profile View Component ---
const ProfileView: React.FC<{
  currentUser: UserProfile;
  pets: Pet[];
  darkMode: boolean;
  onEdit: (pet: Pet) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
  favorites: string[];
  setPosterPet: (pet: Pet) => void;
  handleAddComment: (id: string, text: string) => void;
  handleCheer: (id: string) => void;
  handleStatusChange: (id: string, status: PetStatus) => void;
  onUpdateProfile?: (updates: { name?: string; email?: string; password?: string }) => Promise<any> | null;
}> = ({ currentUser, pets, darkMode, onEdit, onDelete, onBack, onLogout, onToggleFavorite, favorites, setPosterPet, handleAddComment, handleCheer, handleStatusChange, onUpdateProfile }) => {
  
  const myPets = pets.filter(p => p.authorId === currentUser.id);
  const totalCheers = myPets.reduce((acc, curr) => acc + curr.cheers, 0);
  // profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name || '');
  const [editEmail, setEditEmail] = useState(currentUser.email || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [profileImageData, setProfileImageData] = useState<string | null>(null);
  const [profileImageType, setProfileImageType] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setEditName(currentUser.name || '');
    setEditEmail(currentUser.email || '');
    // initialize profile image preview from saved avatar
    setProfileImageUrl(currentUser.avatar || null);
    setProfileImageData(null);
    setProfileImageType(null);
  }, [currentUser]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4">
      <button 
        onClick={onBack}
        className={`mb-6 flex items-center gap-2 text-sm font-medium ${darkMode ? "text-stone-400 hover:text-white" : "text-stone-500 hover:text-stone-800"}`}
      >
        <Home size={16} /> Back to Feed
      </button>

      {/* Profile Header Card */}
      <div className={`rounded-3xl p-8 mb-10 border shadow-sm ${darkMode ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200"}`}>
        <div className="flex flex-col md:flex-row items-center gap-8">
           <div className="relative">
             <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-stone-600 shadow-lg bg-amber-200 flex items-center justify-center">
               {currentUser.avatar ? (
                 <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-amber-700">{currentUser.name.charAt(0)}</div>
               )}
             </div>
             <div className="absolute bottom-0 right-0 bg-green-500 p-2 rounded-full border-4 border-white dark:border-stone-800">
               <CheckCircle2 size={20} className="text-white" />
             </div>
           </div>
           
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2">
                {!isEditing ? (
                  <>
                    <h2 className={`text-3xl font-bold ${darkMode ? "text-white" : "text-stone-800"}`}>{currentUser.name}</h2>
                    <button title="Edit profile" onClick={() => { setIsEditing(true); setEditError(null); }} className="p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700">
                      <Pencil size={18} className="text-stone-400" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    <input className="px-3 py-2 rounded-md border" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <input className="px-3 py-2 rounded-md border" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-stone-500">Profile Photo (optional)</label>
                      <div className="flex items-center gap-2">
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            const match = result.match(/^data:(.+);base64,(.*)$/);
                            if (match) {
                              setProfileImageType(match[1]);
                              setProfileImageData(match[2]);
                              setProfileImageUrl('');
                            }
                          };
                          reader.readAsDataURL(file);
                        }} />
                        <input type="url" className="px-3 py-2 rounded-md border flex-1" placeholder="Or image URL" value={profileImageUrl || ''} onChange={(e) => { setProfileImageUrl(e.target.value); setProfileImageData(null); setProfileImageType(null); }} />
                      </div>
                      {(profileImageData || profileImageUrl || currentUser.avatar) && (
                        <div className="mt-2">
                          <p className="text-xs text-stone-500 mb-1">Preview</p>
                          <img alt="profile preview" src={profileImageData ? `data:${profileImageType};base64,${profileImageData}` : (profileImageUrl || currentUser.avatar || '')} className="w-24 h-24 rounded-full object-cover" />
                        </div>
                      )}
                    </div>
                    {editError && <div className="text-red-500 text-sm">{editError}</div>}
                    <div className="flex gap-2 mt-1">
                      <button disabled={editLoading} onClick={async () => {
                        setEditLoading(true); setEditError(null);
                        try {
                          if (!onUpdateProfile) throw new Error('No update handler configured');
                          const payload: any = { name: editName, email: editEmail };
                          if (profileImageData && profileImageType) { payload.profileImageData = profileImageData; payload.profileImageType = profileImageType; }
                          if (profileImageUrl) payload.profileImageUrl = profileImageUrl;
                          const updated = await onUpdateProfile(payload);
                          if (!updated) {
                            setEditError('Failed to update profile');
                          } else {
                            setIsEditing(false);
                          }
                        } catch (err: any) {
                          setEditError(err?.message || 'Update failed');
                        } finally { setEditLoading(false); }
                      }} className="px-3 py-1 rounded-md bg-amber-500 text-white">{editLoading ? 'Saving…' : 'Save'}</button>
                      <button disabled={editLoading} onClick={() => { setIsEditing(false); setEditName(currentUser.name || ''); setEditEmail(currentUser.email || ''); setEditError(null); }} className="px-3 py-1 rounded-md border">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
                <div className="flex items-center justify-center md:justify-start gap-2 text-stone-500 text-sm">
                  {/* joinedAt can be a Date or string depending on storage — normalize */}
                  {(() => {
                   const joined = currentUser.joinedAt instanceof Date ? currentUser.joinedAt : new Date(currentUser.joinedAt);
                   return <span>Member since {joined.toLocaleDateString()}</span>;
                  })()}
              </div>
              
              <div className="flex gap-4 mt-4 justify-center md:justify-start">
                 <div className={`px-4 py-2 rounded-xl text-center min-w-[100px] ${darkMode ? "bg-stone-700" : "bg-stone-100"}`}>
                    <div className="text-2xl font-bold text-amber-500">{myPets.length}</div>
                    <div className="text-xs text-stone-500 uppercase font-bold">Listings</div>
                 </div>
                 <div className={`px-4 py-2 rounded-xl text-center min-w-[100px] ${darkMode ? "bg-stone-700" : "bg-stone-100"}`}>
                    <div className="text-2xl font-bold text-amber-500">{totalCheers}</div>
                    <div className="text-xs text-stone-500 uppercase font-bold">Cheers</div>
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-3">
              <button onClick={onLogout} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 font-medium transition-colors">
                <LogOut size={18} /> Logout
              </button>
           </div>
        </div>
      </div>

      {/* User Listings */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <LayoutDashboard className="text-amber-500" />
           <h3 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-stone-800"}`}>My Listings</h3>
        </div>

        {myPets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {myPets.map(pet => (
              <PetCard
                key={pet.id}
                pet={pet}
                isFavorite={favorites.includes(pet.id)}
                darkMode={darkMode}
                viewMode="grid"
                currentUser={currentUser}
                onToggleFavorite={() => onToggleFavorite(pet.id)}
                onGeneratePoster={() => setPosterPet(pet)}
                onAddComment={handleAddComment}
                onCheer={handleCheer}
                onStatusChange={handleStatusChange}
                onReport={() => {}} // No reporting own pets
                isOwner={true}
                onEdit={() => onEdit(pet)}
                onDelete={() => onDelete(pet.id)}
              />
            ))}
          </div>
        ) : (
          <div className={`p-12 text-center rounded-2xl border border-dashed ${darkMode ? "border-stone-700 bg-stone-800/50" : "border-stone-200 bg-stone-50"}`}>
             <div className="w-16 h-16 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
               <PawPrint size={32} />
             </div>
             <h3 className={`text-lg font-medium mb-1 ${darkMode ? "text-white" : "text-stone-800"}`}>No listings yet</h3>
             <p className="text-stone-500 max-w-sm mx-auto">You haven't listed any street friends yet. Click the "List Stray" button to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Pet Card Component (Updated) ---
const PetCard: React.FC<{
  pet: Pet;
  isFavorite: boolean;
  darkMode: boolean;
  viewMode: ViewMode;
  currentUser: UserProfile | null;
  onToggleFavorite: () => void;
  onGeneratePoster: () => void;
  onAddComment: (id: string, text: string) => void;
  onCheer: (id: string) => void;
  onStatusChange: (id: string, status: PetStatus) => void;
  onReport: () => void;
  isOwner: boolean; // New prop
  onEdit?: () => void; // New prop
  onDelete?: () => void; // New prop
}> = ({ pet, isFavorite, darkMode, viewMode, currentUser, onToggleFavorite, onGeneratePoster, onAddComment, onCheer, onStatusChange, onReport, isOwner, onEdit, onDelete }) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const whatsappLink = `https://wa.me/${pet.contactNumber}?text=${encodeURIComponent(
    `Hi, I saw ${pet.name} (${pet.type}) on StreetPaws and I'm interested!`
  )}`;

  const urgencyColor = 
    pet.urgency === "Critical" ? "bg-red-500 text-white" :
    pet.urgency === "High" ? "bg-orange-500 text-white" :
    pet.urgency === "Medium" ? "bg-amber-400 text-stone-900" :
    "bg-green-500 text-white";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Adopt ${pet.name}`,
          text: `Check out ${pet.name}, a ${pet.type} found at ${pet.location}.`,
          url: window.location.href
        });
      } catch (e) { console.log("Share cancelled"); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const getContactConfig = () => {
    switch (pet.status) {
      case "Available":
        return { 
          text: "Contact via WhatsApp", 
          style: "bg-[#25D366] hover:bg-[#20bd5a] text-white",
          icon: MessageCircle
        };
      case "Fostered":
        return { 
          text: "Enquire (In Foster)", 
          style: "bg-blue-600 hover:bg-blue-700 text-white",
          icon: MessageCircle 
        };
      case "Adopted":
        return { 
          text: "Enquire Further", 
          style: "bg-stone-600 hover:bg-stone-700 text-white",
          icon: Info
        };
      default:
        return { 
           text: "Contact", 
           style: "bg-stone-500 text-white",
           icon: MessageCircle
        };
    }
  };

  const contactConfig = getContactConfig();
  const ContactIcon = contactConfig.icon;

  return (
    <div className={`group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border flex h-full ${
      viewMode === 'list' ? 'flex-col sm:flex-row h-auto' : 'flex-col'
    } ${darkMode ? "bg-stone-800 border-stone-700" : "bg-white border-stone-100"}`}>
      
      {/* Image Area - Strictly sized for consistency */}
      <div className={`relative shrink-0 overflow-hidden ${
        viewMode === 'list' 
          ? 'sm:w-64 h-64 sm:h-auto' 
          : 'aspect-[4/3] w-full'
      }`}>
        {(() => {
          const imageSrc = (pet as any).imageData ? `data:${(pet as any).imageType};base64,${(pet as any).imageData}` : pet.imageUrl;
          return (
            <img
              src={imageSrc}
          alt={pet.name}
          className={`w-full h-full object-cover transition-transform duration-700 ${pet.status === 'Adopted' ? 'grayscale opacity-70' : 'group-hover:scale-105'}`}
            />
          );
        })()}
        
        {/* Badges: urgency only (distance removed to avoid overlaying photos) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
          <span className={`text-xs font-bold px-2 py-1 rounded shadow-sm ${urgencyColor}`}>
            {pet.urgency} Priority
          </span>
        </div>

        {pet.status === "Adopted" && (
           <div className="absolute inset-0 flex items-center justify-center bg-stone-900/40 backdrop-blur-[1px] z-20">
              <div className="bg-green-500 text-white px-6 py-2 rounded-full font-bold text-xl rotate-[-10deg] shadow-lg border-2 border-white">
                ADOPTED!
              </div>
           </div>
        )}

        <button
          onClick={(e) => { e.preventDefault(); onToggleFavorite(); }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all z-20"
        >
          <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : "text-stone-400"} />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className={`text-xl font-bold truncate pr-2 ${darkMode ? "text-white" : "text-stone-800"}`}>
              {pet.name}
            </h3>
            <span className={`text-xs ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
              {pet.type} • {pet.age}
            </span>
          </div>
          
          {/* Menu Dots (Simplified as Buttons for now) */}
          <div className="flex gap-1 shrink-0">
             <button onClick={() => onGeneratePoster()} className={`p-1.5 rounded hover:bg-stone-100 ${darkMode ? "text-stone-400 hover:bg-stone-700" : "text-stone-400"}`} title="Print Poster">
               <Printer size={16} />
             </button>
             <button onClick={handleShare} className={`p-1.5 rounded hover:bg-stone-100 ${darkMode ? "text-stone-400 hover:bg-stone-700" : "text-stone-400"}`} title="Share">
               <Share2 size={16} />
             </button>
             {!isOwner && (
               <button onClick={onReport} className={`p-1.5 rounded hover:bg-stone-100 ${darkMode ? "text-stone-400 hover:bg-stone-700" : "text-stone-400"}`} title="Report">
                 <Flag size={16} />
               </button>
             )}
          </div>
        </div>

        <div className={`text-sm mb-4 flex items-center gap-1 ${darkMode ? "text-stone-400" : "text-stone-500"}`}>
          <MapPin size={14} className="text-amber-500 shrink-0" />
          <span className="truncate">{pet.location}</span>
        </div>

        {/* Flexible spacer to push buttons to bottom in Grid View */}
        <div className="flex-1 mb-4">
           <p className={`text-sm leading-relaxed line-clamp-3 ${darkMode ? "text-stone-300" : "text-stone-600"}`}>
             {pet.description}
           </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mt-auto">
          {isOwner ? (
             /* Owner Actions */
             <div className="flex gap-2">
               <button 
                 onClick={onEdit}
                 className="flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
               >
                 <Pencil size={16} /> Edit Details
               </button>
               <button 
                 onClick={onDelete}
                 className="px-3 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
               >
                 <Trash2 size={16} />
               </button>
             </div>
          ) : (
             /* Public Actions */
             <div className="flex gap-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${contactConfig.style}`}
              >
                <ContactIcon size={18} />
                {contactConfig.text}
              </a>
              {pet.donationUrl && pet.status === 'Available' && (
                <a 
                  href={pet.donationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center font-semibold text-sm transition-all"
                >
                    Donate
                </a>
              )}
            </div>
          )}

          {/* Social Interactions */}
          <div className={`pt-3 border-t flex justify-between items-center ${darkMode ? "border-stone-700" : "border-stone-100"}`}>
             <div className="flex gap-4">
                <button 
                  onClick={() => onCheer(pet.id)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${darkMode ? "text-stone-400 hover:text-amber-400" : "text-stone-500 hover:text-amber-600"}`}
                >
                  <Sparkles size={14} className={pet.cheers > 0 ? "text-amber-500" : ""} />
                  {pet.cheers} Cheers
                </button>
                <button 
                  onClick={() => setShowComments(!showComments)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${darkMode ? "text-stone-400 hover:text-stone-200" : "text-stone-500 hover:text-stone-800"}`}
                >
                  <MessageCircle size={14} />
                  {pet.comments.length} Notes
                </button>
             </div>
             
             {/* Admin Status Toggle (Only if owner) */}
             {isOwner && (
               <select 
                 className={`text-xs bg-transparent border-none outline-none cursor-pointer max-w-[100px] truncate text-right font-semibold ${darkMode ? "text-amber-500" : "text-amber-700"}`}
                 value={pet.status}
                 onChange={(e) => onStatusChange(pet.id, e.target.value as PetStatus)}
               >
                  <option value="Available">Available</option>
                  <option value="Adopted">Adopted</option>
                  <option value="Fostered">Fostered</option>
               </select>
             )}
             {!isOwner && (
               <span className={`text-xs ${darkMode ? "text-stone-500" : "text-stone-400"}`}>{pet.status}</span>
             )}
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className={`mt-3 p-3 rounded-xl text-sm ${darkMode ? "bg-stone-900/50" : "bg-stone-50"}`}>
               <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                  {pet.comments.length === 0 && <p className="text-xs italic opacity-50">No notes yet.</p>}
                  {pet.comments.map(c => (
                    <div key={c.id} className="text-xs">
                       <span className="font-bold opacity-70">{c.author}: </span>
                       <span className="opacity-90">{c.text}</span>
                    </div>
                  ))}
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={newComment}
                   onChange={(e) => setNewComment(e.target.value)}
                   placeholder="Write a supportive note..."
                   className={`flex-1 px-2 py-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${darkMode ? "bg-stone-800 border-stone-700" : "bg-white border-stone-200"}`}
                 />
                 <button 
                    onClick={() => {
                       if (newComment.trim()) {
                         onAddComment(pet.id, newComment);
                         setNewComment("");
                       }
                    }}
                    className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600"
                 >
                   <Send size={12} />
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Auth modal removed — app now allows guest viewing and listing of pets

// --- AI Chat Bot Component ---

function AIChatBot({ onClose, darkMode }: { onClose: () => void, darkMode: boolean }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Hello! I'm the StreetPaws AI Vet Assistant. How can I help you care for a street animal today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // call backend chat endpoint which uses server-side API key
      const res = await fetch('https://streetpaws-backend-production.up.railway.app/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: userMsg }) });
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: json.reply || "I'm sorry, I couldn't process that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-24 right-6 w-80 sm:w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border animate-in slide-in-from-bottom-5 ${darkMode ? "bg-stone-800 border-stone-700 text-stone-100" : "bg-white border-stone-200 text-stone-800"}`} style={{ height: "500px" }}>
      <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
         <div className="flex items-center gap-2">
           <Stethoscope size={18} />
           <span className="font-bold">Street Vet AI</span>
         </div>
         <button onClick={onClose} className="hover:bg-amber-700 p-1 rounded"><X size={18} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
              m.role === 'user' 
                ? "bg-amber-500 text-white rounded-br-none" 
                : (darkMode ? "bg-stone-700 text-stone-200 rounded-bl-none" : "bg-stone-100 text-stone-800 rounded-bl-none")
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-stone-400 text-center animate-pulse">Consulting knowledge base...</div>}
      </div>

      <div className={`p-3 border-t flex gap-2 ${darkMode ? "border-stone-700" : "border-stone-100"}`}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about basic care..."
          className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${darkMode ? "bg-stone-900 border-stone-600 placeholder-stone-500" : "bg-stone-50 border-stone-200"}`}
        />
        <button onClick={handleSend} disabled={loading} className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// --- Poster Modal Component ---
const PosterModal: React.FC<{ pet: Pet; onClose: () => void }> = ({ pet, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl animate-in zoom-in-95">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10 no-print">
          <h3 className="font-bold text-lg text-stone-800">Print Preview</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800">
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Printable Area */}
        <div className="p-8 print:p-0 print:w-full" id="printable-poster">
           <div className="border-8 border-red-500 p-6 text-center space-y-6">
             <div className="bg-red-600 text-white py-4 px-8 inline-block transform -skew-x-12">
               <h1 className="text-6xl font-black uppercase tracking-widest transform skew-x-12">Adopt Me</h1>
             </div>
             
             <div className="aspect-square w-full max-w-md mx-auto overflow-hidden border-4 border-stone-900 rounded-lg">
                {(() => {
                  const imageSrc = (pet as any).imageData ? `data:${(pet as any).imageType};base64,${(pet as any).imageData}` : pet.imageUrl;
                  return <img src={imageSrc} className="w-full h-full object-cover grayscale contrast-125" />;
                })()}
             </div>

             <div className="space-y-4">
                <h2 className="text-5xl font-bold text-stone-900">{pet.name}</h2>
                <div className="flex justify-center gap-4 text-xl font-medium text-stone-600">
                   <span>{pet.type}</span>
                   <span>•</span>
                   <span>{pet.age}</span>
                   <span>•</span>
                   <span>{pet.location}</span>
                </div>
                <p className="text-2xl leading-relaxed text-stone-800 font-serif italic max-w-xl mx-auto">
                  "{pet.description}"
                </p>
             </div>

             <div className="mt-8 pt-8 border-t-4 border-stone-900 border-dashed">
                <p className="text-xl font-bold uppercase mb-2 text-stone-500">Contact For Adoption</p>
                <p className="text-4xl font-black tracking-widest text-stone-900">{pet.contactNumber}</p>
             </div>
             
             <div className="pt-4 flex justify-center items-center gap-2 opacity-60">
                <PawPrint size={20} />
                <span className="font-bold tracking-tight">StreetPaws.com</span>
             </div>
           </div>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-poster, #printable-poster * { visibility: visible; }
          #printable-poster { position: fixed; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 20px; }
          .no-print { display: none; }
        }
      `}</style>
    </div>
  );
};


// --- Pet Form Modal (Create & Edit) ---

function PetFormModal({
  isOpen,
  onClose,
  onSubmit,
  darkMode,
  currentUser,
  initialData
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pet: Pet) => void;
  darkMode: boolean;
  currentUser: UserProfile | null;
  initialData?: Pet;
}) {
  const [loadingBio, setLoadingBio] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Dog" as PetType,
    age: "",
    location: "",
    description: "",
    imageUrl: "",
    imageData: null as string | null,
    imageType: null as string | null,
    contactNumber: "",
    urgency: "Medium" as UrgencyLevel,
    donationUrl: "",
    traits: "",
  });

  // Populate form if editing
  useEffect(() => {
    if (initialData) {
        setFormData({
        name: initialData.name,
        type: initialData.type,
        age: initialData.age,
        location: initialData.location,
        description: initialData.description,
        imageUrl: initialData.imageUrl || '',
        imageData: (initialData as any).imageData || null,
        imageType: (initialData as any).imageType || null,
        contactNumber: initialData.contactNumber,
        urgency: initialData.urgency,
        donationUrl: initialData.donationUrl || "",
        traits: initialData.traits || "",
      });
    } else {
      // Reset defaults
        setFormData({
        name: "", type: "Dog", age: "", location: "", description: "", imageUrl: "", imageData: null, imageType: null, contactNumber: "", urgency: "Medium", donationUrl: "", traits: ""
      });
    }
  }, [initialData, isOpen]);

  const generateBio = async () => {
    if (!formData.name || !formData.type || !formData.traits) return;
    setLoadingBio(true);
    try {
      const prompt = `Please write a short (1-2 sentences) heartwarming adoption bio for a stray ${formData.type} named ${formData.name}. Traits: ${formData.traits}. Keep it concise and friendly.`;
      const res = await fetch('https://streetpaws-backend-production.up.railway.app/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: prompt }) });
      const json = await res.json();
      if (json?.reply) setFormData((prev) => ({ ...prev, description: json.reply.trim() }));
    } catch (e) { console.error(e); } finally { setLoadingBio(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      // Return updated object
      onSubmit({
        ...initialData,
        ...formData,
      });
    } else {
      // Create new object
      onSubmit({
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        distance: Math.random() * 10, // Mock distance
        postedAt: new Date(),
        status: "Available",
        comments: [],
        cheers: 0,
        authorId: currentUser?.id
      });
    }
  };

  const inputClass = `w-full p-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/50 transition-all border ${darkMode ? "bg-stone-800 border-stone-700 text-white placeholder-stone-500" : "bg-stone-50 border-stone-200 text-stone-800 placeholder-stone-400"}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className={`rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 ${darkMode ? "bg-stone-900" : "bg-white"}`}>
        <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${darkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-100"}`}>
          <div>
            <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-stone-800"}`}>
              {initialData ? "Edit Pet Details" : "List a Street Friend"}
            </h2>
            <p className="text-xs text-stone-500">{initialData ? "Update information" : "Help them find a forever home."}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-stone-800 text-stone-400" : "hover:bg-stone-100 text-stone-500"}`}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Name</label>
              <input required type="text" className={inputClass} placeholder="e.g. Buddy" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
             <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase">Type</label>
              <select className={inputClass} value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as PetType })}>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Bird">Bird</option>
                <option value="Rat">Rat</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1">
             <label className="text-xs font-bold text-stone-500 uppercase">Urgency Level</label>
             <div className="flex gap-2">
               {["Low", "Medium", "High", "Critical"].map(level => (
                 <button
                   key={level}
                   type="button"
                   onClick={() => setFormData({...formData, urgency: level as UrgencyLevel})}
                   className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                     formData.urgency === level 
                       ? "bg-amber-500 text-white border-amber-500" 
                       : (darkMode ? "bg-stone-800 border-stone-700 text-stone-400" : "bg-white border-stone-200 text-stone-500")
                   }`}
                 >
                   {level}
                 </button>
               ))}
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-bold text-stone-500 uppercase">Approx Age</label>
             <input required type="text" className={inputClass} placeholder="e.g. 2 years, Puppy" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 uppercase">Location</label>
            <input required type="text" className={inputClass} placeholder="e.g. Near Central Park" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-500 uppercase">Image (choose file or paste URL)</label>
            <div className="flex gap-2 items-center">
              <input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // read file as base64
                const reader = new FileReader();
                reader.onload = () => {
                  const result = reader.result as string;
                  // strip data:<type>;base64, prefix
                  const match = result.match(/^data:(.+);base64,(.*)$/);
                  if (match) {
                    setFormData({ ...formData, imageData: match[2], imageType: match[1], imageUrl: '' });
                  } else {
                    setFormData({ ...formData, imageData: null, imageType: null });
                  }
                };
                reader.readAsDataURL(file);
              }} />
              <input type="url" className={inputClass + " flex-1"} placeholder="https://... (optional)" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
            </div>
            {(formData.imageData || formData.imageUrl) && (
              <div className="mt-2">
                <p className="text-xs text-stone-500 mb-1">Preview</p>
                <img alt="preview" src={formData.imageData ? `data:${formData.imageType};base64,${formData.imageData}` : formData.imageUrl} className="max-h-40 rounded-md object-cover" />
              </div>
            )}
          </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">WhatsApp (No +)</label>
                <input required type="tel" className={inputClass} placeholder="15551234567" value={formData.contactNumber} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} />
              </div>
               <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Donation URL (Optional)</label>
                <input type="url" className={inputClass} placeholder="PayPal/GoFundMe..." value={formData.donationUrl} onChange={(e) => setFormData({ ...formData, donationUrl: e.target.value })} />
              </div>
           </div>

          <div className={`p-4 rounded-xl border space-y-3 ${darkMode ? "bg-stone-800 border-stone-700" : "bg-amber-50 border-amber-100"}`}>
            <label className="text-sm font-bold text-amber-500 flex items-center gap-2">
              <Sparkles size={16} /> Magic Bio Generator
            </label>
            <div className="flex gap-2">
              <input type="text" className={`flex-1 p-2 rounded-lg text-sm border focus:outline-none ${darkMode ? "bg-stone-700 border-stone-600 text-white" : "bg-white border-amber-200"}`} placeholder="Traits: friendly, shy..." value={formData.traits} onChange={(e) => setFormData({ ...formData, traits: e.target.value })} />
              <button type="button" onClick={generateBio} disabled={loadingBio || !formData.traits} className="bg-amber-500 text-white px-4 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50">
                {loadingBio ? "..." : "Go"}
              </button>
            </div>
            <textarea required className={inputClass} placeholder="Description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <button type="submit" className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-amber-700 shadow-lg">
            {initialData ? "Save Changes" : "List Pet"}
          </button>
        </form>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}
const root = createRoot(rootElement);
root.render(<App />);
