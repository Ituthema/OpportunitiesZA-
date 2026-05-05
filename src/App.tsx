import { useState, useEffect } from 'react';
import { ExternalLink, Clock, MapPin, Briefcase, GraduationCap, ChevronRight, Menu, X, BookOpen, Compass, Search, Bookmark, BookmarkCheck } from 'lucide-react';

interface Opportunity {
  id: string;
  title: string;
  category: string;
  sector: string;
  province: string;
  qualification_level: string;
  stipend: string;
  closing_date: string;
  application_url: string;
  verified: boolean;
  featured: boolean;
  description: string;
}

interface Guide {
  id: string;
  title: string;
  intro: string;
  read_time: string;
  category: string;
  body: string;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface Province {
  id: string;
  label: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'guides' | 'saved'>('opportunities');
  
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const [filterMode, setFilterMode] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, locationFilter, searchQuery]);

  useEffect(() => {
    // Load saved jobs from local storage
    const saved = localStorage.getItem('savedJobs');
    if (saved) {
      try {
        setSavedJobIds(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved jobs:', e);
      }
    }
    async function loadData() {
      try {
        const [oppRes, guideRes, catRes, provRes] = await Promise.all([
          fetch('/data/opportunities.json'),
          fetch('/data/guides.json'),
          fetch('/data/categories.json'),
          fetch('/data/provinces.json')
        ]);
        
        if (oppRes.ok) setOpportunities(await oppRes.json());
        if (guideRes.ok) setGuides(await guideRes.json());
        if (catRes.ok) setCategories(await catRes.json());
        if (provRes.ok) setProvinces(await provRes.json());
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleSaveJob = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSavedJobIds(prev => {
      const newSaved = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem('savedJobs', JSON.stringify(newSaved));
      return newSaved;
    });
  };

  const filteredOpps = opportunities.filter(o => 
    (filterMode === 'all' || o.category === filterMode) &&
    (locationFilter === 'all' || o.province.toLowerCase().includes(locationFilter.toLowerCase()) || locationFilter === 'Nationwide') &&
    (searchQuery === '' || o.title.toLowerCase().includes(searchQuery.toLowerCase()) || o.description.toLowerCase().includes(searchQuery.toLowerCase()) || (o.sector && o.sector.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const maxPerPage = 20;
  const totalPages = Math.ceil(filteredOpps.length / maxPerPage);
  const currentOpps = filteredOpps.slice((currentPage - 1) * maxPerPage, currentPage * maxPerPage);

  const savedOpps = opportunities.filter(o => savedJobIds.includes(o.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-emerald-900 text-white px-4 pt-16 pb-20 text-center shadow-lg relative">
        <div className="absolute inset-0 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">OpportunitiesZA 🇿🇦</h1>
          <p className="text-emerald-100 font-medium text-lg sm:text-xl max-w-2xl mx-auto">
            Your gateway to entry-level jobs, verified learnerships, and career-changing bursaries in South Africa.
          </p>
        </div>
      </header>

      {/* Main Navigation */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-md p-2 flex gap-2 border border-slate-200">
          <button 
            onClick={() => { setActiveTab('opportunities'); setSelectedGuide(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'opportunities' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="hidden sm:inline">Opportunities</span>
            <span className="sm:hidden">Jobs</span>
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'saved' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Bookmark className="w-5 h-5" />
            <span className="hidden sm:inline">Saved</span>
            <span className="sm:hidden">Saved</span>
            {savedJobIds.length > 0 && (
              <span className="bg-emerald-200 text-emerald-900 text-xs py-0.5 px-2 rounded-full font-bold ml-1">
                {savedJobIds.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('guides')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${
              activeTab === 'guides' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="hidden sm:inline">Career Guides</span>
            <span className="sm:hidden">Guides</span>
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="text-center py-20 text-slate-500">
            <div className="animate-spin h-10 w-10 border-4 border-emerald-800 border-t-transparent rounded-full mx-auto mb-4"></div>
            Loading platform data...
          </div>
        ) : (
          <>
            {/* Opportunities View */}
            {activeTab === 'opportunities' && (
              <div className="space-y-6">
                
                {/* Advanced Filters */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                   <div className="flex flex-col gap-4">
                     {/* Search Bar */}
                     <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                         <Search className="h-5 w-5 text-slate-400" />
                       </div>
                       <input
                         type="text"
                         className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                         placeholder="Search by job title, description, or sector..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                       />
                     </div>

                     <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                       <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                         <div className="flex gap-2">
                           <button
                              onClick={() => setFilterMode('all')}
                              className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors whitespace-nowrap ${
                                filterMode === 'all' 
                                  ? 'bg-emerald-800 text-white' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              All Categories
                            </button>
                           {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setFilterMode(cat.id)}
                              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition-colors whitespace-nowrap ${
                                filterMode === cat.id 
                                  ? 'bg-emerald-800 text-white' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <span>{cat.icon}</span> {cat.label}
                            </button>
                          ))}
                         </div>
                       </div>
                       
                       <div className="w-full sm:w-auto shrink-0">
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 font-medium appearance-none cursor-pointer"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                          >
                            <option value="all">📍 All Provinces</option>
                            <option value="Nationwide">🇿🇦 Nationwide</option>
                            {provinces.map(p => (
                              <option key={p.id} value={p.label}>{p.icon} {p.label}</option>
                            ))}
                          </select>
                       </div>
                     </div>
                   </div>
                </div>

                {/* Feed */}
                {filteredOpps.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-slate-500 text-lg font-medium">No opportunities match your current filters.</p>
                    <button 
                      onClick={() => { setFilterMode('all'); setLocationFilter('all'); setSearchQuery(''); }}
                      className="mt-4 text-emerald-700 font-bold hover:underline"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {currentOpps.map((opp) => (
                      <article key={opp.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                          <h2 className="text-xl font-bold text-slate-900 leading-tight">
                            {opp.title}
                          </h2>
                          <div className="flex items-center gap-2">
                            {opp.featured && (
                              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wide">
                                ★ Featured
                              </span>
                            )}
                            <button
                              onClick={(e) => toggleSaveJob(opp.id, e)}
                              className={`p-2 rounded-full transition-colors ${
                                savedJobIds.includes(opp.id)
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                              }`}
                              title={savedJobIds.includes(opp.id) ? "Remove saved job" : "Save job"}
                            >
                              {savedJobIds.includes(opp.id) ? (
                                <BookmarkCheck className="w-5 h-5" />
                              ) : (
                                <Bookmark className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-5">
                          {opp.verified && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200">
                              ✓ Verified Source
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md capitalize">
                            {opp.category}
                          </span>
                        </div>

                        <p className="text-slate-600 mb-6 leading-relaxed">
                          {opp.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 font-medium mb-1">Location</div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <span className="truncate">{opp.province}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 font-medium mb-1">Requirement</div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <GraduationCap className="w-4 h-4 text-emerald-600" />
                              <span className="truncate">{opp.qualification_level}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                            <div className="text-xs text-slate-500 font-medium mb-1">Sector</div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <Briefcase className="w-4 h-4 text-emerald-600" />
                              <span className="truncate">{opp.sector || 'Various'}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                            <div className="text-xs text-slate-500 font-medium mb-1">Stipend/Pay</div>
                            <div className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">R</div>
                              <span className="truncate">{opp.stipend || 'Unspecified'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end border-t border-slate-100 pt-5 gap-4 mt-2">
                          <div className="flex items-center gap-2 font-bold text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg w-full sm:w-auto justify-center">
                            <Clock className="w-4 h-4" />
                            Closes: {new Date(opp.closing_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <a
                            href={opp.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-center items-center gap-2 bg-emerald-800 hover:bg-emerald-900 shadow-md hover:shadow-lg text-white font-bold py-3 px-8 rounded-xl transition-all w-full sm:w-auto"
                          >
                            Apply Now
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </article>
                    ))}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 pt-6 pb-2 border-t border-slate-200 mt-6">
                        <button
                          onClick={() => {
                            setCurrentPage(Math.max(1, currentPage - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-4 py-2 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 text-slate-600 hover:enabled:bg-slate-200"
                        >
                          Previous
                        </button>
                        <span className="text-sm font-medium text-slate-600 px-4">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => {
                            setCurrentPage(Math.min(totalPages, currentPage + 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-100 text-emerald-800 hover:enabled:bg-emerald-200"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Saved View */}
            {activeTab === 'saved' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold text-slate-800">Your Saved Opportunities</h2>
                  <p className="text-slate-500 text-sm mt-1">Keep track of the jobs and bursaries you want to apply for later.</p>
                </div>
                
                {savedOpps.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium">You haven't saved any opportunities yet.</p>
                    <button 
                      onClick={() => setActiveTab('opportunities')}
                      className="mt-4 text-emerald-700 font-bold hover:underline"
                    >
                      Browse Opportunities
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {savedOpps.map((opp) => (
                      <article key={opp.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-emerald-200 transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                          <h2 className="text-xl font-bold text-slate-900 leading-tight">
                            {opp.title}
                          </h2>
                          <div className="flex items-center gap-2">
                            {opp.featured && (
                              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wide">
                                ★ Featured
                              </span>
                            )}
                            <button
                              onClick={(e) => toggleSaveJob(opp.id, e)}
                              className={`p-2 rounded-full transition-colors ${
                                savedJobIds.includes(opp.id)
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                              }`}
                              title={savedJobIds.includes(opp.id) ? "Remove saved job" : "Save job"}
                            >
                              {savedJobIds.includes(opp.id) ? (
                                <BookmarkCheck className="w-5 h-5" />
                              ) : (
                                <Bookmark className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-5">
                          {opp.verified && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200">
                              ✓ Verified Source
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md capitalize">
                            {opp.category}
                          </span>
                        </div>

                        <p className="text-slate-600 mb-6 leading-relaxed">
                          {opp.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 font-medium mb-1">Location</div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <span className="truncate">{opp.province}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-500 font-medium mb-1">Requirement</div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <GraduationCap className="w-4 h-4 text-emerald-600" />
                              <span className="truncate">{opp.qualification_level}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                            <div className="text-xs text-slate-500 font-medium mb-1">Sector</div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                              <Briefcase className="w-4 h-4 text-emerald-600" />
                              <span className="truncate">{opp.sector || 'Various'}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                            <div className="text-xs text-slate-500 font-medium mb-1">Stipend/Pay</div>
                            <div className="font-bold text-emerald-700 flex items-center gap-1.5 text-sm">
                              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">R</div>
                              <span className="truncate">{opp.stipend || 'Unspecified'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end border-t border-slate-100 pt-5 gap-4 mt-2">
                          <div className="flex items-center gap-2 font-bold text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg w-full sm:w-auto justify-center">
                            <Clock className="w-4 h-4" />
                            Closes: {new Date(opp.closing_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <a
                            href={opp.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-center items-center gap-2 bg-emerald-800 hover:bg-emerald-900 shadow-md hover:shadow-lg text-white font-bold py-3 px-8 rounded-xl transition-all w-full sm:w-auto"
                          >
                            Apply Now
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Guides View */}
            {activeTab === 'guides' && (
              <div className="space-y-6">
                {!selectedGuide ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {guides.map((guide) => (
                      <div 
                        key={guide.id} 
                        onClick={() => setSelectedGuide(guide)}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full group"
                      >
                         <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors">{guide.title}</h3>
                         <p className="text-slate-600 mb-6 flex-grow">{guide.intro}</p>
                         <div className="flex justify-between items-center text-sm font-semibold text-slate-500 pt-4 border-t border-slate-100">
                           <span className="flex items-center gap-1">
                             <Clock className="w-4 h-4" /> {guide.read_time} read
                           </span>
                           <span className="text-emerald-600 flex items-center">
                             Read Full Guide <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                           </span>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                      <button 
                        onClick={() => setSelectedGuide(null)}
                        className="flex items-center gap-1 text-slate-600 hover:text-emerald-800 font-semibold text-sm transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Guides
                      </button>
                    </div>
                    <div className="p-6 md:p-10">
                      <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{selectedGuide.title}</h2>
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mb-8 pb-8 border-b border-slate-100">
                        <span className="bg-slate-100 px-3 py-1 rounded-full">{selectedGuide.read_time} read</span>
                        <span className="uppercase tracking-wider">{selectedGuide.category.replace('-', ' ')}</span>
                      </div>
                      
                      {/* Guide Body rendered as HTML safely (since it's from our own static JSON) */}
                      <div className="prose prose-slate prose-emerald max-w-none text-slate-700 mx-auto" dangerouslySetInnerHTML={{ __html: selectedGuide.body }} />
                      
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-10 px-4 text-center text-slate-500 text-sm">
        <p className="mb-2"><strong>OpportunitiesZA</strong> is entirely free to use.</p>
        <p>Legitimate learnerships will NEVER ask you to pay an application fee.</p>
        <p className="mt-6">© {new Date().getFullYear()} OpportunitiesZA. Built for South African Youth.</p>
      </footer>
    </div>
  );
}
