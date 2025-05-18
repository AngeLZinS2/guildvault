
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Package, Search, Plus, Building, Shield, Warehouse, Loader2, Upload, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  fetchProperties, 
  addPropertyWithItems, 
  addItemToProperty,
  uploadItemIcon,
  updatePropertyItem,
  deletePropertyItem,
  Property,
  Item,
} from "@/services/propertyService";

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [iconUploading, setIconUploading] = useState(false);
  
  // Estado para nova propriedade
  const [newPropertyNumber, setNewPropertyNumber] = useState("");
  const [newPropertyType, setNewPropertyType] = useState("");
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newItem, setNewItem] = useState<Omit<Item, 'id' | 'property_id'>>({ name: "", quantity: 1 });
  const [newPropertyItems, setNewPropertyItems] = useState<Omit<Item, 'id' | 'property_id'>[]>([]);
  
  // Estado para novos itens
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  
  useEffect(() => {
    loadProperties();
  }, []);
  
  const loadProperties = async () => {
    setLoading(true);
    const result = await fetchProperties();
    if (result.success) {
      setProperties(result.data);
    } else {
      toast({
        title: "Erro ao carregar propriedades",
        description: "Não foi possível carregar as propriedades.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  // Handle icon upload for new item
  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>, isNewProperty: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo para ícones é de 500KB.",
        variant: "destructive"
      });
      return;
    }
    
    setIconUploading(true);
    
    try {
      const iconUrl = await uploadItemIcon(file);
      
      if (iconUrl) {
        if (isNewProperty) {
          setNewItem(prev => ({ ...prev, icon_url: iconUrl }));
        } else {
          setNewItem(prev => ({ ...prev, icon_url: iconUrl }));
        }
        
        toast({
          title: "Ícone carregado",
          description: "O ícone foi carregado com sucesso."
        });
      }
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar o ícone.",
        variant: "destructive"
      });
    } finally {
      setIconUploading(false);
    }
  };

  // Filter properties based on search and filter
  const filteredProperties = properties.filter((property) => {
    const matchesSearch = property.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || property.type === filterType;
    return matchesSearch && matchesType;
  });

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Farm":
        return <Building className="h-5 w-5" />;
      case "HQ":
        return <Shield className="h-5 w-5" />;
      case "Depósito":
        return <Warehouse className="h-5 w-5" />;
      default:
        return <Home className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Farm":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "HQ":
        return "bg-guild-primary/20 text-guild-primary border-guild-primary/30";
      case "Depósito":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Adicionar novo item à lista de itens da nova propriedade
  const addItemToPropertyList = () => {
    if (!newItem.name) {
      return;
    }
    setNewPropertyItems([...newPropertyItems, { ...newItem }]);
    setNewItem({ name: "", quantity: 1 });
  };

  // Adicionar nova propriedade
  const addNewProperty = async () => {
    if (!newPropertyNumber || !newPropertyType || !newPropertyLocation) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newProperty: Omit<Property, 'id'> = {
      number: newPropertyNumber,
      type: newPropertyType,
      location: newPropertyLocation,
      items: []
    };

    const result = await addPropertyWithItems(newProperty, newPropertyItems);
    
    if (result.success) {
      // Reset form
      setNewPropertyNumber("");
      setNewPropertyType("");
      setNewPropertyLocation("");
      setNewPropertyItems([]);
      setIsAddDialogOpen(false);
      
      // Reload properties
      loadProperties();
    }
  };

  // Adicionar novo item ao inventário de uma propriedade existente
  const handleAddItemToProperty = async () => {
    if (!selectedProperty || !newItem.name) {
      toast({
        title: "Erro",
        description: "Selecione uma propriedade e informe o nome do item",
        variant: "destructive"
      });
      return;
    }

    const result = await addItemToProperty(selectedProperty.id, newItem);
    
    if (result.success) {
      toast({
        title: "Item adicionado",
        description: `${newItem.name} foi adicionado ao inventário.`
      });
      
      setNewItem({ name: "", quantity: 1 });
      setIsAddItemDialogOpen(false);
      
      // Reload properties to update the UI
      loadProperties();
    }
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId: string) => {
    const result = await deletePropertyItem(itemId);
    
    if (result.success) {
      toast({
        title: "Item removido",
        description: "Item removido com sucesso."
      });
      
      // Reload properties to update the UI
      loadProperties();
    } else {
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto px-4 pt-20 pb-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Propriedades</h1>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="guild-button-primary">
              <Plus className="h-5 w-5 mr-2" /> Adicionar Propriedade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Propriedade</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="house-number" className="text-sm font-medium">
                    Número da Casa
                  </label>
                  <Input
                    id="house-number"
                    placeholder="Ex: 42"
                    className="guild-input"
                    value={newPropertyNumber}
                    onChange={(e) => setNewPropertyNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="house-type" className="text-sm font-medium">
                    Tipo
                  </label>
                  <Select value={newPropertyType} onValueChange={setNewPropertyType}>
                    <SelectTrigger className="guild-input">
                      <SelectValue placeholder="Selecionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pequena">Pequena</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Grande">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="location" className="text-sm font-medium">
                  Localização
                </label>
                <Input 
                  id="location" 
                  placeholder="Ex: Paleto Bay" 
                  className="guild-input"
                  value={newPropertyLocation}
                  onChange={(e) => setNewPropertyLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Itens Iniciais</label>
                <div className="border border-guild-primary/20 rounded-md p-4 bg-guild-dark/50">
                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Nome do Item" 
                        className="guild-input flex-1" 
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      />
                      <Input 
                        type="number" 
                        placeholder="Qtd" 
                        className="guild-input w-24" 
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <label htmlFor="icon-upload" className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md cursor-pointer border 
                          ${newItem.icon_url ? 'border-guild-primary/50 bg-guild-primary/10' : 'border-dashed border-gray-500'}`}>
                          {newItem.icon_url ? 
                            <Image className="h-4 w-4 text-guild-primary" /> : 
                            <Upload className="h-4 w-4" />
                          }
                          <span className="text-sm">{newItem.icon_url ? 'Ícone carregado' : 'Upload de ícone (16x16)'}</span>
                        </label>
                        <input
                          id="icon-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleIconUpload(e, true)}
                          disabled={iconUploading}
                        />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="guild-button-ghost"
                        onClick={addItemToPropertyList}
                        disabled={!newItem.name || iconUploading}
                      >
                        {iconUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {newPropertyItems.length > 0 && (
                    <div className="mt-3 border-t border-guild-primary/10 pt-2">
                      <p className="text-sm font-medium mb-2">Itens adicionados:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {newPropertyItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {item.icon_url && (
                                <img 
                                  src={item.icon_url} 
                                  alt={item.name} 
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    // Replace with a placeholder if image fails to load
                                    (e.target as HTMLImageElement).src = 'placeholder.svg';
                                  }}
                                />
                              )}
                              <span>{item.name}</span>
                            </div>
                            <span className="text-gray-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Adicione os itens que já existem nesta propriedade</p>
                </div>
              </div>
            </form>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                className="guild-button-ghost"
              >
                Cancelar
              </Button>
              <Button 
                className="guild-button-primary" 
                onClick={addNewProperty}
              >
                Adicionar Propriedade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar por número ou localização..."
            className="guild-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="guild-input w-full sm:w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="Pequena">Pequena</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Grande">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-guild-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map((property) => (
            <Card 
              key={property.id}
              className={`guild-card cursor-pointer hover:border-guild-primary transition-all ${
                selectedProperty?.id === property.id ? 'border-guild-primary' : ''
              }`}
              onClick={() => handlePropertyClick(property)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Casa #{property.number}</CardTitle>
                    <CardDescription>{property.location}</CardDescription>
                  </div>
                  <Badge className={`${getTypeColor(property.type)}`}>
                    <span className="flex items-center">
                      {getTypeIcon(property.type)}
                      <span className="ml-1">{property.type}</span>
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-2">Itens: {property.items?.length || 0}</p>
                <div className="space-y-2">
                  {property.items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        {item.icon_url && (
                          <img 
                            src={item.icon_url} 
                            alt={item.name} 
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'placeholder.svg';
                            }}
                          />
                        )}
                        <span>{item.name}</span>
                      </div>
                      <span className="text-gray-400">x{item.quantity}</span>
                    </div>
                  ))}
                  {property.items && property.items.length > 3 && (
                    <p className="text-xs text-guild-primary text-center mt-2">
                      +{property.items.length - 3} mais itens
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredProperties.length === 0 && (
        <div className="text-center py-12 bg-guild-dark/50 rounded-lg border border-guild-primary/20 mt-6">
          <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-1">Nenhuma propriedade encontrada</h3>
          <p className="text-gray-400">
            Adicione uma nova propriedade usando o botão acima
          </p>
        </div>
      )}

      {selectedProperty && (
        <Card className="guild-card mt-10">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl mb-1">
                  Casa #{selectedProperty.number} - {selectedProperty.location}
                </CardTitle>
                <CardDescription className="flex items-center">
                  {getTypeIcon(selectedProperty.type)}
                  <span className="ml-1">{selectedProperty.type}</span>
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" className="guild-button-ghost">
                  Editar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Itens no Baú</h3>
                <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="guild-button-ghost">
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome do Item</label>
                        <Input 
                          placeholder="Ex: Lockpick" 
                          className="guild-input" 
                          value={newItem.name}
                          onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quantidade</label>
                        <Input 
                          type="number" 
                          placeholder="Quantidade" 
                          className="guild-input" 
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ícone</label>
                        <div className="relative">
                          <label htmlFor="item-icon-upload" className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md w-full cursor-pointer border 
                            ${newItem.icon_url ? 'border-guild-primary/50 bg-guild-primary/10' : 'border-dashed border-gray-500'}`}>
                            {newItem.icon_url ? (
                              <div className="flex items-center gap-2">
                                <Image className="h-4 w-4 text-guild-primary" />
                                <span className="text-sm">Ícone carregado</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                <span className="text-sm">Upload de ícone (16x16)</span>
                              </div>
                            )}
                          </label>
                          <input
                            id="item-icon-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleIconUpload}
                            disabled={iconUploading}
                          />
                        </div>
                        {newItem.icon_url && (
                          <div className="flex items-center justify-center mt-2">
                            <img 
                              src={newItem.icon_url} 
                              alt="Ícone do item" 
                              className="w-8 h-8 object-contain border border-guild-primary/30 rounded p-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'placeholder.svg';
                              }}
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Tamanho recomendado: 16x16px. Máx: 500KB.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddItemDialogOpen(false)}
                        className="guild-button-ghost"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleAddItemToProperty}
                        disabled={!newItem.name || iconUploading}
                      >
                        {iconUploading ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</>
                        ) : (
                          'Adicionar'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="bg-guild-dark/50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-guild-primary/20">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Item</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">Quantidade</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProperty.items && selectedProperty.items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                          Nenhum item encontrado nesta propriedade.
                        </td>
                      </tr>
                    ) : (
                      selectedProperty.items && selectedProperty.items.map((item) => (
                        <tr 
                          key={item.id}
                          className="border-b border-guild-primary/10 last:border-none hover:bg-guild-primary/5"
                        >
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              {item.icon_url && (
                                <img 
                                  src={item.icon_url} 
                                  alt={item.name} 
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'placeholder.svg';
                                  }}
                                />
                              )}
                              {item.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              Editar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-xs text-red-500"
                              onClick={() => item.id && handleDeleteItem(item.id)}
                            >
                              Remover
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
