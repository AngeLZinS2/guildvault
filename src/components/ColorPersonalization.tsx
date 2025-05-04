
import React, { useState } from 'react';
import { Settings, Check } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from '@/hooks/use-toast';

type ThemeColor = {
  name: string;
  primary: string;
  class: string;
}

const COLOR_OPTIONS: ThemeColor[] = [
  { name: "Azul", primary: "#1EAEDB", class: "theme-blue" },
  { name: "Roxo", primary: "#9b87f5", class: "theme-purple" },
  { name: "Verde", primary: "#10B981", class: "theme-green" },
  { name: "Vermelho", primary: "#ef4444", class: "theme-red" },
  { name: "Laranja", primary: "#F97316", class: "theme-orange" },
  { name: "Rosa", primary: "#EC4899", class: "theme-pink" },
];

export function ColorPersonalization() {
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    // Get saved theme from localStorage or default to "theme-blue"
    return localStorage.getItem('guild-theme') || 'theme-blue';
  });

  const applyTheme = (themeClass: string) => {
    // Remove all theme classes
    document.documentElement.classList.remove(...COLOR_OPTIONS.map(c => c.class));
    
    // Add the selected theme class
    document.documentElement.classList.add(themeClass);
    
    // Save to localStorage
    localStorage.setItem('guild-theme', themeClass);
    
    setSelectedColor(themeClass);
    setOpen(false);
    
    toast({
      title: "Tema atualizado",
      description: "O tema do sistema foi alterado com sucesso.",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="border-guild-primary/30 text-white hover:bg-guild-primary/20 ml-2"
          onClick={() => setOpen(true)}
        >
          <Settings className="mr-1 h-5 w-5" />
          Personalizar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-guild-surface border-guild-primary/30">
        <div className="space-y-4">
          <h3 className="font-medium text-lg text-white">Personalizar Sistema</h3>
          <p className="text-sm text-gray-300">
            Escolha a cor principal do sistema
          </p>
          
          <RadioGroup 
            value={selectedColor} 
            onValueChange={(value) => applyTheme(value)}
            className="grid grid-cols-3 gap-2"
          >
            {COLOR_OPTIONS.map((color) => (
              <div key={color.class} className="relative">
                <RadioGroupItem
                  value={color.class}
                  id={color.class}
                  className="peer sr-only"
                />
                <label
                  htmlFor={color.class}
                  className="flex flex-col items-center justify-center rounded-md border-2 border-white/10 bg-guild-dark/50 p-2 hover:bg-guild-dark/70 hover:text-accent-foreground peer-data-[state=checked]:border-white peer-data-[state=checked]:bg-guild-dark cursor-pointer"
                >
                  <div 
                    className="w-6 h-6 rounded-full mb-1" 
                    style={{ backgroundColor: color.primary }}
                  />
                  <div className="text-white text-xs">{color.name}</div>
                  {selectedColor === color.class && (
                    <Check className="w-3 h-3 absolute top-1.5 right-1.5 text-white" />
                  )}
                </label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}
