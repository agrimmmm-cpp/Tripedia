import React from "react";
import { Link } from "react-router-dom";

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-300">
    {children}
  </span>
);

const Card: React.FC<React.PropsWithChildren<{ title: string; subtitle: string; icon?: React.ReactNode }>> = ({ title, subtitle, children, icon }) => (
  <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 md:p-9 shadow-xl min-h-[200px]">
    <div className="flex items-start gap-4">
      <div className="grid place-items-center size-12 rounded-2xl bg-slate-800 text-cyan-300 text-xl">
        {icon ?? <span>🌟</span>}
      </div>
      <div>
        <div className="text-lg md:text-xl font-semibold text-slate-100">{title}</div>
        <div className="mt-2 text-sm md:text-base text-slate-300">{subtitle}</div>
        {children}
      </div>
    </div>
  </div>
);

const SectionTitle: React.FC<{ kicker?: string; title: React.ReactNode }> = ({ kicker, title }) => (
  <div className="text-center mb-10 md:mb-14">
    {kicker && <div className="inline-block mb-3"><Badge>{kicker}</Badge></div>}
    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-100 tracking-tight">
      {title}
    </h2>
  </div>
);

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid place-items-center size-10 rounded-xl bg-slate-800 text-cyan-300">✈️</span>
            <span className="text-lg font-semibold">Tripidea</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#features" className="hover:text-slate-100">Features</a>
            <a href="#how" className="hover:text-slate-100">How it Works</a>
            <a href="#testimonials" className="hover:text-slate-100">Testimonials</a>
            {/* Pricing removed */}
          </div>
          <div className="flex items-center gap-3">
            {/* Sign In removed */}
            <Link to="/planner" className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-semibold px-3.5 py-1.5 text-sm hover:opacity-95">
              Get Started 
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-20 grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 md:p-12 shadow-2xl">
            <div className="mb-5"><Badge>AI-Powered Planning</Badge></div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Plan your dream trip with{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">ease</span>
            </h1>
            <p className="mt-5 text-slate-300 text-base md:text-lg">
              From spontaneous weekend getaways to carefully planned adventures across continents, Tripidea helps you
              organize every detail. Create itineraries, discover hidden gems, and make memories that last forever.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Link to="/planner" className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-400 text-slate-950 font-semibold px-5 py-2.5 hover:opacity-95">
                Start Planning 
              </Link>
              {/* Watch Demo removed */}
            </div>

            {/* quick bullets */}
            <div className="mt-9 grid grid-cols-3 gap-4 text-xs md:text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5">
                <div className="font-semibold">Smart Suggestions</div>
                <div className="text-slate-400">AI-powered recommendations</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5">
                <div className="font-semibold">Interactive Maps</div>
                <div className="text-slate-400">Visualize your route</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5">
                <div className="font-semibold">Mobile Ready</div>
                <div className="text-slate-400">Access anywhere</div>
              </div>
            </div>
          </div>

          {/* right mockup column */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 md:p-12 shadow-2xl">
            <div className="text-sm text-slate-300 mb-3">Your Travel Ideas</div>
            <div className="space-y-5">
              {[
                { title: "Paris in Spring", items: ["Visit the Louvre", "Seine river cruise", "Montmartre cafés"], color: "bg-amber-100/90 text-slate-900" },
                { title: "Beach Vibes", items: ["Sunset snorkel", "Tiki bar crawl", "Local food tour"], color: "bg-emerald-100/90 text-slate-900" },
                { title: "Mountain Adventure", items: ["Swiss Alps hike", "Cozy mountain lodges", "Photography spots"], color: "bg-pink-100/90 text-slate-900" },
              ].map((c, i) => (
                <div key={i} className={`rounded-2xl p-5 md:p-6 shadow ${c.color}`}>
                  <div className="font-semibold text-lg">{c.title}</div>
                  <ul className="mt-2 list-disc pl-5 text-sm md:text-base space-y-1">
                    {c.items.map((x, j) => <li key={j}>{x}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle
          kicker="Features"
          title={<>Everything you need to plan the <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">perfect trip</span></>}
        />
        <div className="grid md:grid-cols-3 gap-7 md:gap-8">
          <Card title="Smart Destination Discovery" subtitle="Find perfect destinations based on your preferences, budget, and travel style with AI-powered recommendations." />
          <Card title="Intelligent Itinerary Builder" subtitle="Create detailed day-by-day plans with optimal routing, timing, and activity suggestions." />
          <Card title="Collaborative Planning" subtitle="Plan together with friends and family. Share ideas, vote on activities, and build consensus." />
          <Card title="Local Insights" subtitle="Access insider tips, hidden gems, and recommendations from experienced travelers." />
          <Card title="Travel Safety Tools" subtitle="Stay informed with real-time updates, embassy contacts, and emergency assistance." />
          <Card title="Offline Access" subtitle="Download your itineraries and maps for offline use when exploring without internet." />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle kicker="How It Works" title={<>From idea to adventure in <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">4 simple steps</span></>} />
        <div className="grid md:grid-cols-4 gap-7 md:gap-8">
          {[
            { step: "Step 1", title: "Discover", text: "Tell us your preferences and budget. Our AI finds the perfect match." },
            { step: "Step 2", title: "Plan", text: "Build your itinerary with smart tools. Add activities and hidden gems." },
            { step: "Step 3", title: "Collaborate", text: "Invite friends to edit and vote on activities together." },
            { step: "Step 4", title: "Travel", text: "Access plans anywhere with confidence and real-time updates." },
          ].map((s, i) => (
            <div key={i} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 md:p-9 min-h-[190px]">
              <div className="text-slate-300">{s.step}</div>
              <div className="mt-1 text-xl font-semibold">{s.title}</div>
              <div className="mt-2 text-sm md:text-base text-slate-400">{s.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-4xl md:text-5xl font-extrabold tracking-tight mb-10">
          Loved by travelers <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">worldwide</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-7 md:gap-8">
          {[
            { name: "Sarah Johnson", role: "Digital Nomad", text: "Tripidea transformed how I plan my travels. The AI suggestions led me to hidden gems I never would have found!", stars: 5 },
            { name: "Mike & Lisa Chen", role: "Adventure Couple", text: "Planning our honeymoon was so easy. Collaborative features helped us build our dream itinerary.", stars: 5 },
            { name: "David Rodriguez", role: "Business Traveler", text: "Smart scheduling and local insights saved me hours. Essential for both business and leisure trips.", stars: 5 },
          ].map((t, i) => (
            <div key={i} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 md:p-9">
              <div className="text-amber-300 text-lg">{"★".repeat(t.stars)}</div>
              <p className="mt-3 text-slate-300 italic text-base">“{t.text}”</p>
              <div className="mt-5 text-sm text-slate-400">{t.name} · {t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid place-items-center size-8 rounded-xl bg-slate-800 text-cyan-300">✈️</span>
              <span className="text-lg font-semibold">Tripidea</span>
            </div>
            <p className="mt-3 text-slate-400">Transform your travel dreams into unforgettable journeys with AI-powered planning tools.</p>
          </div>
          <div>
            <div className="font-semibold mb-2">Product</div>
            <ul className="space-y-1 text-slate-400">
              <li><a href="#features" className="hover:text-slate-200">Features</a></li>
              <li><a href="#how" className="hover:text-slate-200">How it Works</a></li>
              {/* Pricing link removed */}
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Company</div>
            <ul className="space-y-1 text-slate-400">
              <li><a className="hover:text-slate-200" href="#">About Us</a></li>
              <li><a className="hover:text-slate-200" href="#">Careers</a></li>
              <li><a className="hover:text-slate-200" href="#">Press</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Resources</div>
            <ul className="space-y-1 text-slate-400">
              <li><a className="hover:text-slate-200" href="#">Help Center</a></li>
              <li><a className="hover:text-slate-200" href="#">Travel Guides</a></li>
              <li><a className="hover:text-slate-200" href="#">API Documentation</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
