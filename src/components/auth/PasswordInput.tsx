
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  id = "password",
  className,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder="Sua senha"
        value={value}
        onChange={onChange}
        className={`pr-10 ${className}`}
        required={required}
        disabled={disabled}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
        disabled={disabled}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};
