
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Package, Search, Plus, Building, Shield, Warehouse, Loader2, Upload, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { rpRequest } from "@/services/rpService";
import { 
  fetchProperties, 
  addPropertyWithItems, 
  addItemToProperty,
  uploadItemIcon,
  deletePropertyItem,
  Property,
  Item,
} from "@/services/propertyService";

export default function Properties() {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const canEdit = isAdmin && !adminLoading;
  const [searchParams, setSearchParams] = useSearchParams();
  const emptyStock = searchParams.get('stock') === 'empty';
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const uploading = useRef(false);
  const [movementItem, setMovementItem] = useState<Item | null>(null);
  const [movementType, setMovementType] = useState('in');
  const [movementQuantity, setMovementQuantity] = useState('1');
  const [movementError, setMovementError] = useState('');
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
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
  
  const loadProperties = useCallback(async () => {
    setLoading(true);
    const result = await fetchProperties();
    if (result.success) {
      setProperties(result.data);
      setSelectedProperty(current => current ? result.data.find((property: Property) => property.id === current.id) ?? null : null);
    } else {
      toast({
        title: "Erro ao carregar propriedades",
        description: "Não foi possível carregar as propriedades.",
        variant: "destructive"
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadProperties(); }, [loadProperties]);

  const mutate = async (operation: () => Promise<void>) => {
    if (!canEdit || busy.current || uploading.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await operation();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error instanceof Error ? error.message : 'Não foi possível concluir a operação.', variant: 'destructive' });
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const validQuantity = (quantity: number) => Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 2147483647;
  const syncItems = (propertyId: string, transform: (items: Item[]) => Item[]) => {
    const update = (property: Property) => property.id === propertyId ? { ...property, items: transform(property.items) } : property;
    setProperties(previous => previous.map(update));
    setSelectedProperty(previous => previous ? update(previous) : null);
  };
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('stock'); return next; });
  };
  const visibleItems = (property: Property) => (property.items ?? []).filter(item =>
    (!emptyStock || item.quantity === 0) && (!searchTerm.trim() ||
      property.number.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.trim().toLowerCase())));

  // Handle icon upload for new item
  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>, isNewProperty: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file || !canEdit || busy.current || uploading.current) return;
    
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
    
    uploading.current = true;
    setIconUploading(true);
    
    try {
      const iconUrl = await uploadItemIcon(file);
      if (!iconUrl) throw new Error('Falha no upload');
      
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
      uploading.current = false;
      setIconUploading(false);
    }
  };

  // Filter properties based on search and filter
  const filteredProperties = properties.filter((property) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = property.number.toLowerCase().includes(query) ||
                         property.location.toLowerCase().includes(query) ||
                         property.items?.some(item => item.name.toLowerCase().includes(query));
    const matchesType = filterType === "all" || property.type === filterType;
    return matchesSearch && matchesType && (!emptyStock || visibleItems(property).length > 0);
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
    if (!canEdit || saving || iconUploading || !newItem.name.trim() || !validQuantity(newItem.quantity)) {
      return;
    }
    setNewPropertyItems([...newPropertyItems, { ...newItem, name: newItem.name.trim() }]);
    setNewItem({ name: "", quantity: 1 });
  };

  // Adicionar nova propriedade
  const addNewProperty = async () => {
    if (!newPropertyNumber.trim() || !newPropertyType.trim() || !newPropertyLocation.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newProperty: Omit<Property, 'id'> = {
      number: newPropertyNumber.trim(),
      type: newPropertyType.trim(),
      location: newPropertyLocation.trim(),
      items: []
    };

    await mutate(async () => {
    const result = await addPropertyWithItems(newProperty, newPropertyItems);
    
    if (result.success) {
      // Reset form
      setNewPropertyNumber("");
      setNewPropertyType("");
      setNewPropertyLocation("");
      setNewPropertyItems([]);
      setIsAddDialogOpen(false);
      
      // Reload properties
      setNewItem({ name: '', quantity: 1 });
      await loadProperties();
    } else {
      await loadProperties();
    }
    });
  };

  // Adicionar novo item ao inventário de uma propriedade existente
  const handleAddItemToProperty = async () => {
    if (!selectedProperty || !newItem.name.trim() || !validQuantity(newItem.quantity)) {
      toast({
        title: "Erro",
        description: "Informe o nome e uma quantidade inteira não negativa",
        variant: "destructive"
      });
      return;
    }

    await mutate(async () => {
    const result = await addItemToProperty(selectedProperty.id, { ...newItem, name: newItem.name.trim() });
    if (!result.success) throw result.error;
    
    if (result.success) {
      toast({
        title: "Item adicionado",
        description: `${newItem.name} foi adicionado ao inventário.`
      });
      syncItems(selectedProperty.id, items => [...items, result.data]);
      
      setNewItem({ name: "", quantity: 1 });
      setIsAddItemDialogOpen(false);
      
      // Reload properties to update the UI
      await loadProperties();
    }
    });
  };

  // Handle item deletion
  const handleDeleteItem = async (itemId: string) => {
    await mutate(async () => {
    const result = await deletePropertyItem(itemId);
    
    if (result.success) {
      if (selectedProperty) syncItems(selectedProperty.id, items => items.filter(item => item.id !== itemId));
      toast({
        title: "Item removido",
        description: "Item removido com sucesso."
      });
      
      // Reload properties to update the UI
      setDeleteItem(null);
      await loadProperties();
    } else {
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item.",
        variant: "destructive"
      });
    }
    });
  };

  const handleMovement = async () => {
    setMovementError('');
    const amount = movementQuantity.trim() === '' ? NaN : Number(movementQuantity);
    const current = selectedProperty?.items.find(item => item.id === movementItem?.id);
    if (!current?.id || !validQuantity(amount) || amount === 0 || (movementType === 'out' && amount > current.quantity)) {
      setMovementError('Use um inteiro positivo até 2147483647. A saída não pode exceder o estoque.');
      return;
    }
    const quantity = current.quantity + (movementType === 'out' ? -amount : amount);
    if (!validQuantity(quantity)) {
      setMovementError('O estoque final deve estar entre 0 e 2147483647 unidades.');
      return;
    }
    await mutate(async () => {
      await rpRequest('stock', 'POST', { item_id: current.id, quantity: amount, kind: movementType === 'out' ? 'exit' : 'entry', reason: 'Ajuste registrado no inventário da propriedade' });
      const update = (property: Property): Property => ({ ...property, items: property.items.map(item => item.id === current.id ? { ...item, quantity } : item) });
      setProperties(previous => previous.map(property => property.id === selectedProperty.id ? update(property) : property));
      setSelectedProperty(previous => previous ? update(previous) : null);
      setMovementItem(null);
      await loadProperties();
      toast({ title: 'Estoque atualizado' });
    });
  };

  return (
    <div className="mx-auto max-w-[1400px] motion-enter">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div><h1 className="text-4xl font-bold">Seu território</h1><p className="mt-1 text-sm text-muted-foreground">Propriedades, bases e tudo o que a crew conquistou.</p></div>
        
        {canEdit && <Dialog open={isAddDialogOpen} onOpenChange={open => { if (!saving && !iconUploading) { setIsAddDialogOpen(open); setNewItem({ name: '', quantity: 1 }); } }}>
          <DialogTrigger asChild>
            <Button className="guild-button-primary">
              <Plus className="h-5 w-5 mr-2" /> Adicionar Propriedade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Propriedade</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 py-4" onSubmit={event => event.preventDefault()}>
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
                        min="0"
                        step="1"
                        value={Number.isNaN(newItem.quantity) ? '' : newItem.quantity}
                        onChange={(e) => setNewItem({...newItem, quantity: e.target.valueAsNumber})}
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
                        type="button"
                        disabled={!newItem.name.trim() || !validQuantity(newItem.quantity) || iconUploading || saving}
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
                disabled={saving || iconUploading}
                className="guild-button-ghost"
              >
                Cancelar
              </Button>
              <Button 
                className="guild-button-primary" 
                onClick={addNewProperty}
                disabled={saving || iconUploading}
              >
                Adicionar Propriedade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar por número, localização ou item..."
            aria-label="Pesquisar por número, localização ou item"
            className="guild-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="guild-input w-full sm:w-48" aria-label="Filtrar por tipo de propriedade">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="Pequena">Pequena</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Grande">Grande</SelectItem>
          </SelectContent>
        </Select>
        <Select value={emptyStock ? 'empty' : 'all'} onValueChange={value => setSearchParams(previous => { const next = new URLSearchParams(previous); if (value === 'empty') next.set('stock', 'empty'); else next.delete('stock'); return next; })}>
          <SelectTrigger className="guild-input w-full sm:w-48" aria-label="Filtrar estoque"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todo o estoque</SelectItem><SelectItem value="empty">Estoque vazio</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {filteredProperties.reduce((total, property) => total + visibleItems(property).length, 0)} itens / {filteredProperties.reduce((total, property) => total + visibleItems(property).reduce((units, item) => units + item.quantity, 0), 0)} unidades nos resultados
      </p>
      
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
              role="button"
              tabIndex={0}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handlePropertyClick(property);
                }
              }}
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
                <p className="text-sm text-gray-400 mb-2">Itens: {property.items?.length || 0} / Unidades: {(property.items ?? []).reduce((total, item) => total + item.quantity, 0)}</p>
                <div className="space-y-2">
                  {visibleItems(property).slice(0, 3).map((item, idx) => (
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
                  {visibleItems(property).length > 3 && (
                    <p className="text-xs text-guild-primary text-center mt-2">
                      +{visibleItems(property).length - 3} mais itens
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
            {properties.length ? 'Tente outra busca ou limpe os filtros.' : canEdit ? 'Adicione uma nova propriedade usando o botão acima.' : 'Nenhuma propriedade cadastrada.'}
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Itens no Baú ({selectedProperty.items.length} itens / {selectedProperty.items.reduce((total, item) => total + item.quantity, 0)} unidades)</h3>
                {canEdit && <Dialog open={isAddItemDialogOpen} onOpenChange={open => { if (!saving && !iconUploading) { setIsAddItemDialogOpen(open); setNewItem({ name: '', quantity: 1 }); } }}>
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
                          min="0"
                          step="1"
                          value={Number.isNaN(newItem.quantity) ? '' : newItem.quantity}
                          onChange={(e) => setNewItem({...newItem, quantity: e.target.valueAsNumber})}
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
                        disabled={saving || iconUploading}
                        className="guild-button-ghost"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleAddItemToProperty}
                        disabled={!newItem.name.trim() || !validQuantity(newItem.quantity) || iconUploading || saving}
                      >
                        {iconUploading ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</>
                        ) : (
                          'Adicionar'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>}
              </div>
              
              <div className="bg-guild-dark/50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-guild-primary/20">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Item</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">Quantidade</th>
                      {canEdit && <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems(selectedProperty).length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 3 : 2} className="px-4 py-8 text-center text-gray-400">
                          Nenhum item encontrado nesta propriedade com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      visibleItems(selectedProperty).map((item) => (
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
                          {canEdit && <td className="px-4 py-3 text-sm text-right">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={saving || !item.id} onClick={() => { setMovementItem(item); setMovementType('in'); setMovementQuantity('1'); setMovementError(''); }}>
                              Movimentar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-xs text-red-500"
                              disabled={saving || !item.id}
                              onClick={() => setDeleteItem(item)}
                            >
                              Remover
                            </Button>
                          </td>}
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
      {canEdit && <Dialog open={!!movementItem} onOpenChange={open => { if (!open && !saving) setMovementItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Movimento de estoque</DialogTitle></DialogHeader>
          <p>{movementItem?.name} — Estoque: {selectedProperty?.items.find(item => item.id === movementItem?.id)?.quantity ?? 0}</p>
          <Select value={movementType} onValueChange={setMovementType} disabled={saving}>
            <SelectTrigger aria-label="Tipo de movimento"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="in">Entrada</SelectItem><SelectItem value="out">Saída</SelectItem></SelectContent>
          </Select>
          <label htmlFor="movement-quantity">Quantidade</label>
          <Input id="movement-quantity" type="number" min="1" max="2147483647" step="1" value={movementQuantity} onChange={event => setMovementQuantity(event.target.value)} disabled={saving} aria-invalid={!!movementError} aria-describedby={movementError ? 'movement-error' : undefined} />
          {movementError && <p id="movement-error" role="alert" className="text-sm text-red-500">{movementError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setMovementItem(null)}>Cancelar</Button>
            <Button disabled={saving} onClick={handleMovement}>{saving ? 'Salvando...' : 'Confirmar movimento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>}
      {canEdit && <Dialog open={!!deleteItem} onOpenChange={open => { if (!open && !saving) setDeleteItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir item?</DialogTitle></DialogHeader>
          <p>Excluir {deleteItem?.name} e suas {deleteItem?.quantity} unidades? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={saving} onClick={() => deleteItem?.id && handleDeleteItem(deleteItem.id)}>{saving ? 'Excluindo...' : 'Excluir item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>}
    </div>
  );
}
