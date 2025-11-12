import React, { useState, useEffect, useRef } from 'react';

interface CategoryInputProps {
  value: string;
  onChange: (newValue: string) => void;
  existingCategories: string[];
  placeholder?: string;
}

const CategoryInput = ({ value, onChange, existingCategories, placeholder }: CategoryInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const lowercasedValue = value.toLowerCase();
      const filtered = existingCategories.filter(cat =>
        cat.toLowerCase().includes(lowercasedValue)
      );
      setFilteredCategories(filtered);
    }
  }, [value, existingCategories, isOpen]);

  // Handle clicks outside to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  const handleSelectCategory = (category: string) => {
    onChange(category);
    setIsOpen(false);
  };
  
  const showCreateNew = value.trim().length > 0 && !existingCategories.some(c => c.toLowerCase() === value.trim().toLowerCase());

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300"
        autoComplete="off"
      />
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          <ul className="py-1">
            {filteredCategories.map(category => (
              <li
                key={category}
                onClick={() => handleSelectCategory(category)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-800 cursor-pointer"
              >
                {category}
              </li>
            ))}
            {showCreateNew && (
              <li
                onClick={() => handleSelectCategory(value.trim())}
                className="px-4 py-2 text-sm text-green-700 hover:bg-green-50 cursor-pointer border-t border-slate-200"
              >
                <span className="font-semibold">Adicionar nova categoria:</span> "{value.trim()}"
              </li>
            )}
             {filteredCategories.length === 0 && !showCreateNew && (
                <li className="px-4 py-2 text-sm text-slate-500">
                    Nenhuma categoria encontrada.
                </li>
             )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CategoryInput;