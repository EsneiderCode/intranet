export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E3A5F] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[#F97316]/30 blur-3xl" />
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-[#F97316] rounded-2xl flex items-center justify-center">
              <span className="text-4xl font-bold text-white">U</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Umtelkomd</h1>
          <p className="text-xl text-blue-200 mb-2">Sistema de Gestión Interna</p>
          <p className="text-blue-300 text-sm">Fibra Óptica · Alemania</p>
        </div>
      </div>
      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <div className="w-14 h-14 bg-[#1E3A5F] rounded-xl flex items-center justify-center mr-3">
              <span className="text-2xl font-bold text-white">U</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E3A5F]">Umtelkomd</h1>
              <p className="text-sm text-muted-foreground">Gestión Interna</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
