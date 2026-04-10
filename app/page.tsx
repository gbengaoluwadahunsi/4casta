'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { BarChart3, Database, LineChart, Shield, Building2, Users, Zap, TrendingUp, Globe, Mic, MessageSquare, Brain, Lock, Sparkles, ArrowRight, CheckCircle2, Star, ChevronRight, MapPin } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden transition-colors duration-500">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px]" />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:50px_50px] opacity-[0.05]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border transition-all">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-cyan-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
              </div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight">
                4<span className="text-primary">casta</span>
              </span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-6">
              <nav className="hidden md:flex items-center gap-8">
                <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
                <Link href="#ai" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">AI</Link>
                <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              </nav>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link href="/auth/login">
                  <Button className="bg-primary hover:bg-primary/90 text-white border-0 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-48 pb-20 sm:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-muted/30 backdrop-blur-sm mb-12 hover:bg-muted/50 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Branch Forecasting Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-balance leading-[1] tracking-tight mb-8">
              The Future of{' '}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent pb-2">
                  Branch Forecasting
                </span>
                <div className="absolute bottom-4 left-0 w-full h-4 bg-primary/10 -rotate-1 rounded-full blur-sm" />
              </span>
            </h1>

            <p className="text-lg sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
              Transform raw data into actionable insights with voice-first AI.
              Navigate, analyze, and forecast — all hands-free.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link href="/auth/login">
                <Button size="lg" className="h-16 px-10 text-lg font-bold bg-gradient-to-r from-primary to-cyan-500 hover:scale-105 shadow-2xl shadow-primary/20 transition-all duration-300 group">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-bold glass hover:bg-muted/50 transition-all">
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 max-w-4xl mx-auto">
              <div className="glass p-6 rounded-2xl">
                <div className="text-4xl sm:text-5xl font-black text-primary mb-1">99.9%</div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Accuracy</div>
              </div>
              <div className="glass p-6 rounded-2xl">
                <div className="text-4xl sm:text-5xl font-black text-primary mb-1">3+ Years</div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Historical Data</div>
              </div>
              <div className="glass p-6 rounded-2xl">
                <div className="text-4xl sm:text-5xl font-black text-primary mb-1">100%</div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Private AI</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section id="ai" className="py-24 sm:py-36 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-6">
              <Brain className="w-4 h-4" />
              <span>Voice-First AI</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight">
              Control with Your Voice
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium leading-relaxed">
              Navigate the entire application without lifting a finger.
              Our AI understands context and responds naturally to your needs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Mic, title: 'Voice Navigation', desc: '"Go to forecast" — and you\'re there' },
              { icon: MessageSquare, title: 'AI Assistant', desc: 'Ask questions in plain English' },
              { icon: Brain, title: 'Smart Predictions', desc: 'ML-powered seasonal forecasting' },
              { icon: Lock, title: 'Private by Design', desc: 'Your data never leaves your infrastructure' },
            ].map((item, i) => (
              <Card key={i} className="group glass border-border/50 hover:bg-muted/50 transition-all duration-500 hover:-translate-y-2">
                <CardHeader className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <CardDescription className="text-muted-foreground text-lg leading-relaxed font-medium">
                    {item.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Demo Card */}
          <div className="mt-20 max-w-4xl mx-auto">
            <Card className="glass border-primary/20 overflow-hidden relative shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-cyan-500/5 animate-pulse" />
              <CardContent className="p-10 relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-center md:text-left">
                    <h3 className="text-3xl font-black mb-4">Try Voice Commands</h3>
                    <p className="text-xl text-muted-foreground font-medium italic">"Hey 4casta, show me the Q3 projections for the Sydney branch..."</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Badge variant="outline" className="text-lg py-2 px-6 border-primary/30 text-primary font-bold">"Go to forecast"</Badge>
                    <Badge variant="outline" className="text-lg py-2 px-6 border-primary/30 text-primary font-bold">"Show my data"</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 sm:py-36 relative bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium">
              Professional-grade forecasting tools that adapt to your organization&apos;s needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Database, title: 'Pre-loaded Data', desc: 'Three years of historical data ready to use' },
              { icon: LineChart, title: 'Smart Forecasting', desc: 'Seasonal naive + growth with ML adjustments' },
              { icon: Shield, title: 'Role-Based Access', desc: 'HQ Admin, Region Admin, Branch User tiers' },
              { icon: Building2, title: 'Branch Management', desc: 'Organize by region with full tracking' },
              { icon: Users, title: 'Team Collaboration', desc: 'Multiple users, controlled access' },
              { icon: BarChart3, title: 'Visual Analytics', desc: 'Interactive charts and dashboards' },
            ].map((item, i) => (
              <Card key={i} className="glass border-border/50 hover:bg-background/80 transition-all duration-300 group">
                <CardHeader className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                    <item.icon className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <CardDescription className="text-muted-foreground text-lg leading-relaxed font-medium">
                    {item.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Access Levels */}
      <section className="py-24 sm:py-36">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: 'HQ Admin', icon: Shield, color: 'text-primary', features: ['All branches & regions', 'Company-wide view', 'User management', 'System settings'] },
              { title: 'Region Admin', icon: MapPin, color: 'text-cyan-500', features: ['Regional branches', 'Forecast management', 'Performance tracking', 'Team oversight'] },
              { title: 'Branch User', icon: Building2, color: 'text-muted-foreground', features: ['Own branch only', 'View forecasts', 'Generate predictions', 'Branch stats'] },
            ].map((item, i) => (
              <Card key={i} className={`glass border-border/50 relative overflow-hidden ${i === 0 ? 'border-primary/50 shadow-2xl shadow-primary/10' : ''}`}>
                {i === 0 && <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-bl-lg">Most Powerful</div>}
                <CardHeader className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 ${item.color}`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-2xl font-black">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <ul className="space-y-4">
                    {item.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${item.color}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-36 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Card className="relative overflow-hidden glass border-primary/30 p-12 sm:p-20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-cyan-500/10" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-8 tracking-tight">
                Ready to Transform Your Forecasting?
              </h2>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-12 font-medium leading-relaxed">
                Join forward-thinking teams using 4casta to predict trends,
                optimize resources, and drive growth.
              </p>
              <Link href="/auth/login">
                <Button size="lg" className="h-18 px-12 text-xl font-black bg-primary text-white hover:scale-105 shadow-2xl transition-all duration-300 group">
                  Get Started Free
                  <ArrowRight className="ml-2 w-7 h-7 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-20 bg-muted/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter">4casta</span>
              </div>
              <p className="text-lg text-muted-foreground font-medium max-w-sm">
                The next generation of branch forecasting, powered by voice-first AI technology.
              </p>
            </div>
            <div>
              <h4 className="font-black mb-6 uppercase tracking-widest text-sm">Product</h4>
              <ul className="space-y-4 text-muted-foreground font-medium">
                <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="#ai" className="hover:text-primary transition-colors">AI Assistant</Link></li>
                <li><Link href="/auth/login" className="hover:text-primary transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-6 uppercase tracking-widest text-sm">Legal</h4>
              <ul className="space-y-4 text-muted-foreground font-medium">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm font-bold text-muted-foreground">
              &copy; 2026 4casta Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">System Status: Optimal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}