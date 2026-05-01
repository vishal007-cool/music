import React, { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import { 
  Home, 
  Search, 
  Library, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Heart, 
  Music, 
  Clock,
  TrendingUp,
  User,
  Disc,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

/**
 * DEEZER API CONFIGURATION
 * Note: Deezer API often requires a CORS proxy for client-side calls.
 * We use a common open CORS proxy for demonstration.
 */
const API_BASE = "https://api.deezer.com";
const CORS_PROXY = "https://corsproxy.io/?";

// --- CONTEXT API ---

const PlayerContext = createContext();

const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('pulse_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    const saved = localStorage.getItem('pulse_recent');
    return saved ? JSON.parse(saved) : [];
  });

  const audioRef = useRef(new Audio());

  useEffect(() => {
    localStorage.setItem('pulse_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('pulse_recent', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  const togglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (track, newQueue = []) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    setCurrentTrack(track);
    setQueue(newQueue.length > 0 ? newQueue : [track]);
    
    // Update Recently Played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 10);
    });

    audioRef.current.src = track.preview;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const nextTrack = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    playTrack(queue[nextIndex], queue);
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    playTrack(queue[prevIndex], queue);
  };

  const toggleFavorite = (track) => {
    setFavorites(prev => {
      const isFav = prev.find(f => f.id === track.id);
      if (isFav) return prev.filter(f => f.id !== track.id);
      return [track, ...prev];
    });
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, queue, favorites, recentlyPlayed,
      playTrack, togglePlay, nextTrack, prevTrack, toggleFavorite, audioRef
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

// --- COMPONENTS ---

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'library', icon: Library, label: 'Library' },
  ];

  return (
    <div className="w-64 bg-black h-full flex flex-col p-6 hidden md:flex">
      <div className="flex items-center gap-2 mb-10 text-emerald-500">
        <div className="bg-emerald-500 p-1.5 rounded-lg text-black">
          <Music size={24} fill="currentColor" />
        </div>
        <span className="text-2xl font-bold tracking-tight">Pulse</span>
      </div>

      <nav className="space-y-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-4 w-full px-2 py-2 transition-colors rounded-md ${
              activeTab === item.id ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <item.icon size={24} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-10 pt-10 border-t border-zinc-800">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Your Library</h3>
        <div className="space-y-4 text-zinc-400">
          <button onClick={() => setActiveTab('favorites')} className="flex items-center gap-3 hover:text-white transition-colors w-full">
            <Heart size={20} />
            <span>Liked Songs</span>
          </button>
          <button onClick={() => setActiveTab('recent')} className="flex items-center gap-3 hover:text-white transition-colors w-full">
            <Clock size={20} />
            <span>Recently Played</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TrackCard = ({ track, collection }) => {
  const { playTrack, currentTrack, isPlaying, toggleFavorite, favorites } = useContext(PlayerContext);
  const isCurrent = currentTrack?.id === track.id;
  const isLiked = favorites.some(f => f.id === track.id);

  return (
    <div 
      className="group bg-zinc-900/40 hover:bg-zinc-800/60 p-4 rounded-xl transition-all duration-300 relative cursor-pointer"
      onClick={() => playTrack(track, collection)}
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-lg shadow-lg">
        <img 
          src={track.album?.cover_medium || track.artist?.picture_medium} 
          alt={track.title}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isCurrent ? 'opacity-100' : ''}`}>
          <div className="bg-emerald-500 text-black p-3 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
            {isCurrent && isPlaying ? <Pause fill="black" size={24} /> : <Play fill="black" size={24} />}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold truncate ${isCurrent ? 'text-emerald-500' : 'text-white'}`}>{track.title}</h4>
          <p className="text-zinc-400 text-sm truncate">{track.artist?.name}</p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track);
          }}
          className={`ml-2 transition-colors ${isLiked ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'}`}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
};

const MusicPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, audioRef } = useContext(PlayerContext);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => {
      const p = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(p) ? 0 : p);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => nextTrack());
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, [nextTrack]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  if (!currentTrack) return null;

  const handleProgressChange = (e) => {
    const newProgress = parseFloat(e.target.value);
    const time = (newProgress / 100) * audioRef.current.duration;
    audioRef.current.currentTime = time;
    setProgress(newProgress);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 border-t border-zinc-800 p-4 backdrop-blur-lg flex items-center justify-between z-50 animate-in slide-in-from-bottom duration-500">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/4">
        <img 
          src={currentTrack.album?.cover_small} 
          alt="" 
          className="w-14 h-14 rounded shadow-md hidden sm:block"
        />
        <div className="overflow-hidden">
          <h5 className="text-white font-bold text-sm truncate">{currentTrack.title}</h5>
          <p className="text-zinc-400 text-xs truncate">{currentTrack.artist?.name}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
        <div className="flex items-center gap-6">
          <button onClick={prevTrack} className="text-zinc-400 hover:text-white transition-colors">
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button 
            onClick={togglePlay}
            className="bg-white text-black p-2 rounded-full hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
          </button>
          <button onClick={nextTrack} className="text-zinc-400 hover:text-white transition-colors">
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[10px] text-zinc-500 w-8">0:{(Math.floor(audioRef.current.currentTime)).toString().padStart(2, '0')}</span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={progress}
            onChange={handleProgressChange}
            className="flex-1 h-1 rounded-lg appearance-none bg-zinc-800 accent-emerald-500 cursor-pointer"
          />
          <span className="text-[10px] text-zinc-500 w-8">0:30</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 w-1/4 justify-end">
        <Volume2 size={20} className="text-zinc-400" />
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24 h-1 rounded-lg appearance-none bg-zinc-800 accent-emerald-500 cursor-pointer hidden md:block"
        />
      </div>
    </div>
  );
};

// --- PAGES ---

const HomePage = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(`${CORS_PROXY}${API_BASE}/chart/0/tracks`);
        const data = await res.json();
        setTrending(data.data || []);
      } catch (err) {
        console.error("Failed to fetch charts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="relative h-64 rounded-2xl overflow-hidden flex items-end p-8 bg-gradient-to-br from-emerald-900 to-zinc-900">
        <div className="z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 block">Featured Playlist</span>
          <h1 className="text-5xl font-black text-white mb-4">Daily Mix</h1>
          <p className="text-zinc-300 max-w-lg">Hand-picked tunes based on your listening history. Fresh tracks every 24 hours.</p>
        </div>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-20 transform rotate-12 scale-150">
          <Disc size={200} />
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-emerald-500" /> Trending Now
          </h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {trending.slice(0, 10).map(track => (
              <TrackCard key={track.id} track={track} collection={trending} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
           <User className="text-emerald-500" /> Top Artists
        </h2>
        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          {trending.slice(0, 8).map((track, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-3 w-32 group cursor-pointer">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg border-2 border-transparent group-hover:border-emerald-500 transition-all">
                <img src={track.artist.picture_medium} alt="" className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all" />
              </div>
              <span className="text-sm font-medium text-zinc-400 group-hover:text-white truncate w-full text-center">
                {track.artist.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${CORS_PROXY}${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.data || []);
    } catch (err) {
      setError("Failed to fetch search results. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="relative group max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?" 
          className="w-full bg-zinc-800/50 border border-transparent focus:border-emerald-500/50 focus:bg-zinc-800 rounded-full py-4 pl-12 pr-6 outline-none text-white placeholder-zinc-500 transition-all"
        />
        {query && (
          <button 
            type="button"
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X size={20} />
          </button>
        )}
      </form>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <AlertCircle size={48} className="mb-4 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold mb-6">Top Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map(track => (
              <TrackCard key={track.id} track={track} collection={results} />
            ))}
          </div>
        </div>
      )}

      {!loading && !results.length && !error && (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
          <Disc size={64} className="mb-4 opacity-20" />
          <p className="text-lg">Find your next favorite track</p>
        </div>
      )}
    </div>
  );
};

const LibraryPage = () => {
  const { favorites, recentlyPlayed } = useContext(PlayerContext);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Heart className="text-pink-500" fill="currentColor" /> Liked Songs
        </h2>
        {favorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {favorites.map(track => (
              <TrackCard key={track.id} track={track} collection={favorites} />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/40 p-12 rounded-2xl flex flex-col items-center text-zinc-500">
            <Music size={48} className="mb-4 opacity-20" />
            <p>Your liked songs will appear here</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Clock className="text-zinc-400" /> Recently Played
        </h2>
        {recentlyPlayed.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {recentlyPlayed.map(track => (
              <TrackCard key={track.id} track={track} collection={recentlyPlayed} />
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/40 p-12 rounded-2xl flex flex-col items-center text-zinc-500">
            <Clock size={48} className="mb-4 opacity-20" />
            <p>Nothing played yet. Start listening!</p>
          </div>
        )}
      </section>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="flex h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-6 bg-black sticky top-0 z-40 border-b border-zinc-900">
          <div className="flex items-center gap-2 text-emerald-500">
            <Music size={24} fill="currentColor" />
            <span className="text-xl font-bold">Pulse</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('search')}><Search size={22} /></button>
            <button onClick={() => setActiveTab('library')}><Library size={22} /></button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 md:p-10">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'search' && <SearchPage />}
          {activeTab === 'library' && <LibraryPage />}
          {activeTab === 'favorites' && <LibraryPage />}
          {activeTab === 'recent' && <LibraryPage />}
        </div>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex justify-around p-4 z-40">
        <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-emerald-500' : 'text-zinc-500'}>
          <Home size={24} />
        </button>
        <button onClick={() => setActiveTab('search')} className={activeTab === 'search' ? 'text-emerald-500' : 'text-zinc-500'}>
          <Search size={24} />
        </button>
        <button onClick={() => setActiveTab('library')} className={activeTab === 'library' ? 'text-emerald-500' : 'text-zinc-500'}>
          <Library size={24} />
        </button>
      </div>

      <MusicPlayer />
    </div>
  );
};

export default function App() {
  return (
    <PlayerProvider>
      <MainContent />
    </PlayerProvider>
  );
}

// Add some global styles for nicer UI
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slide-in-bottom { from { transform: translateY(1rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  
  .animate-in { animation: var(--anim-name) var(--anim-duration) ease-out; }
  .fade-in { --anim-name: fade-in; --anim-duration: 0.5s; }
  .slide-in-from-bottom { --anim-name: slide-in-bottom; --anim-duration: 0.4s; }
  
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  input[type=range] {
    -webkit-appearance: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: #10b981;
    cursor: pointer;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
  }
`;
document.head.appendChild(styleSheet);