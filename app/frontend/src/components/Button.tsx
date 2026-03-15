interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function Button({ children, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white/70 transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
