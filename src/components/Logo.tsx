import logo from "@/assets/reditto-logo.png";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo = ({ className = "", showText = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logo} 
        alt="Reditto Logo" 
        className="w-8 h-8 object-contain"
      />
      {showText && (
        <span className="text-xl font-bold tracking-wide text-foreground">
          REDITTO
        </span>
      )}
    </div>
  );
};