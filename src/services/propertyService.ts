
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Property = {
  id: string;
  number: string;
  type: string;
  location: string;
  items: Item[];
  created_at?: string;
}

export type Item = {
  id?: string;
  property_id?: string;
  name: string;
  quantity: number;
  icon_url?: string | null;
  created_at?: string;
}

// Upload item icon to Supabase Storage
export const uploadItemIcon = async (file: File): Promise<string | null> => {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to Supabase storage
    const { data, error } = await supabase
      .storage
      .from('item-icons')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    if (!data?.path) throw new Error('Upload não retornou uma URL');
    return data.path;
  } catch (error: unknown) {
    console.error("Erro ao fazer upload do ícone:", error);
    return null;
  }
};

export const fetchProperties = async () => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, items(*)');

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Erro ao buscar propriedades:", error);
    return { success: false, error };
  }
};

export const addProperty = async (property: Omit<Property, 'id' | 'items'>) => {
  try {
    // Add the property first
    const { data, error } = await supabase
      .from('properties')
      .insert({
        number: property.number,
        type: property.type,
        location: property.location
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Erro ao adicionar propriedade:", error);
    return { success: false, error };
  }
};

export const addItemToProperty = async (propertyId: string, item: Omit<Item, 'id' | 'property_id'>) => {
  try {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 0 || item.quantity > 2147483647) {
      throw new Error('Quantidade deve ser um inteiro não negativo');
    }
    const { data, error } = await supabase
      .from('items')
      .insert({
        property_id: propertyId,
        name: item.name,
        quantity: item.quantity,
        icon_url: item.icon_url || null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Erro ao adicionar item:", error);
    return { success: false, error };
  }
};

export const addPropertyWithItems = async (property: Omit<Property, 'id'>, items: Omit<Item, 'id' | 'property_id'>[]) => {
  try {
    if (items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 0 || item.quantity > 2147483647)) {
      throw new Error('Quantidade deve ser um inteiro não negativo');
    }
    // First add the property
    const propertyResult = await addProperty(property);
    
    if (!propertyResult.success) {
      throw propertyResult.error;
    }
    
    const propertyId = propertyResult.data.id;
    
    // Then add each item
    if (items.length > 0) {
      for (const item of items) {
        const result = await addItemToProperty(propertyId, item);
        if (!result.success) throw new Error('Propriedade criada, mas houve falha ao adicionar itens. Confira o inventário antes de tentar novamente.');
      }
    }
    
    toast({
      title: "Propriedade adicionada com sucesso",
      description: `Casa #${property.number} foi adicionada com sucesso.`
    });
    
    return { success: true, data: propertyResult.data };
  } catch (error: unknown) {
    toast({
      title: "Erro ao adicionar propriedade",
      description: error instanceof Error ? error.message : 'Não foi possível adicionar a propriedade.',
      variant: "destructive"
    });
    
    return { success: false, error };
  }
};

export const updatePropertyItem = async (itemId: string, updates: Partial<Item>) => {
  try {
    if (updates.quantity !== undefined && (!Number.isSafeInteger(updates.quantity) || updates.quantity < 0 || updates.quantity > 2147483647)) {
      throw new Error('Quantidade deve ser um inteiro não negativo');
    }
    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: unknown) {
    console.error("Erro ao atualizar item:", error);
    return { success: false, error };
  }
};

export const deletePropertyItem = async (itemId: string) => {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Erro ao deletar item:", error);
    return { success: false, error };
  }
};
