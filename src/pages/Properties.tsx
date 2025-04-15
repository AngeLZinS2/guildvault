
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Package, Search, Plus, Building, Shield, Warehouse, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  fetchProperties, 
  addPropertyWithItems, 
  addPropertyTransaction, 
  fetchPropertyTransactions,
  addItemToProperty,
  updatePropertyItem,
  deletePropertyItem,
  Property,
  Item,
  Transaction
} from "@/services/propertyService";

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado para nova propriedade
  const [newPropertyNumber, setNewPropertyNumber] = useState("");
  const [newPropertyType, setNewPropertyType] = useState("");
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newItem, setNewItem] = useState<Omit<Item, 'id' | 'property_id'>>({ name: "", quantity: 1 });
  const [newPropertyItems, setNewPropertyItems] = useState<Omit<Item, 'id' | 'property_id'>[]>([]);
  
  // Estado para novos itens e transações
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);
  const [newTransactionDescription, setNewTransactionDescription] = useState("");
  const [newTransactionAmount, setNewTransactionAmount] = useState(0);
  const [newTransactionType, setNewTransactionType] = useState<"deposit" | "withdrawal">("deposit");
  
  // Estado para transações da propriedade
  const [propertyTransactions, setPropertyTransactions] = useState<Transaction[]>([]);
  
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

  useEffect(() => {
    if (selectedProperty) {
      loadPropertyTransactions(selectedProperty.id);
    }
  }, [selectedProperty]);

  const loadPropertyTransactions = async (propertyId: string) => {
    const result = await fetchPropertyTransactions(propertyId);
    if (result.success) {
      setPropertyTransactions(result.data);
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

  // Adicionar nova transação
  const handleAddTransaction = async () => {
    if (!selectedProperty || !newTransactionDescription || newTransactionAmount <= 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos da transação corretamente",
        variant: "destructive"
      });
      return;
    }

    const transaction: Omit<Transaction, 'id'> = {
      property_id: selectedProperty.id,
      description: newTransactionDescription,
      amount: newTransactionType === "withdrawal" ? -Math.abs(newTransactionAmount) : Math.abs(newTransactionAmount),
      date: new Date().toISOString()
    };

    const result = await addPropertyTransaction(transaction);
    
    if (result.success) {
      toast({
        title: "Transação registrada",
        description: "Transação registrada com sucesso."
      });
      
      setNewTransactionDescription("");
      setNewTransactionAmount(0);
      setNewTransactionType("deposit");
      setIsAddTransactionDialogOpen(false);
      
      // Reload transactions
      if (selectedProperty) {
        loadPropertyTransactions(selectedProperty.id);
      }
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
                  <div className="flex gap-2 mb-2">
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="guild-button-ghost"
                      onClick={addItemToPropertyList}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {newPropertyItems.length > 0 && (
                    <div className="mt-3 border-t border-guild-primary/10 pt-2">
                      <p className="text-sm font-medium mb-2">Itens adicionados:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {newPropertyItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.name}</span>
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
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name}</span>
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
            <Tabs defaultValue="inventory">
              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="inventory">Inventário</TabsTrigger>
                <TabsTrigger value="transactions">Transações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="inventory">
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
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancelar</Button>
                          <Button onClick={handleAddItemToProperty}>Adicionar</Button>
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
                              <td className="px-4 py-3 text-sm">{item.name}</td>
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
              </TabsContent>
              
              <TabsContent value="transactions">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">TDN de Haists</h3>
                    
                    <Dialog open={isAddTransactionDialogOpen} onOpenChange={setIsAddTransactionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="guild-button-ghost">
                          <Plus className="h-4 w-4 mr-1" /> Registrar Transação
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Registrar Transação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo</label>
                            <Select value={newTransactionType} onValueChange={(value: "deposit" | "withdrawal") => setNewTransactionType(value)}>
                              <SelectTrigger className="guild-input">
                                <SelectValue placeholder="Selecionar tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="deposit">Entrada (+)</SelectItem>
                                <SelectItem value="withdrawal">Saída (-)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Descrição</label>
                            <Input 
                              placeholder="Ex: Fleeca Bank Heist" 
                              className="guild-input" 
                              value={newTransactionDescription}
                              onChange={(e) => setNewTransactionDescription(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Valor ($)</label>
                            <Input 
                              type="number" 
                              placeholder="Valor" 
                              className="guild-input" 
                              min="1"
                              value={newTransactionAmount}
                              onChange={(e) => setNewTransactionAmount(parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddTransactionDialogOpen(false)}>Cancelar</Button>
                          <Button onClick={handleAddTransaction}>Registrar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="bg-guild-dark/50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-guild-primary/20">
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Descrição</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">Valor</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-400">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                              Nenhuma transação registrada para esta propriedade.
                            </td>
                          </tr>
                        ) : (
                          propertyTransactions.map((transaction) => (
                            <tr 
                              key={transaction.id} 
                              className="border-b border-guild-primary/10 last:border-none hover:bg-guild-primary/5"
                            >
                              <td className="px-4 py-3 text-sm">{transaction.description}</td>
                              <td className={`px-4 py-3 text-sm text-right ${
                                transaction.amount < 0 ? 'text-red-500' : 'text-green-500'
                              }`}>
                                {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                {new Date(transaction.date).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
