
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

export type Transaction = {
  id: string;
  property_id: string;
  description: string;
  amount: number;
  date: string;
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
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase
      .storage
      .from('item-icons')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error("Erro ao fazer upload do ícone:", error.message);
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
  } catch (error: any) {
    console.error("Erro ao buscar propriedades:", error.message);
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
  } catch (error: any) {
    console.error("Erro ao adicionar propriedade:", error.message);
    return { success: false, error };
  }
};

export const addItemToProperty = async (propertyId: string, item: Omit<Item, 'id' | 'property_id'>) => {
  try {
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
  } catch (error: any) {
    console.error("Erro ao adicionar item:", error.message);
    return { success: false, error };
  }
};

export const addPropertyWithItems = async (property: Omit<Property, 'id'>, items: Omit<Item, 'id' | 'property_id'>[]) => {
  try {
    // First add the property
    const propertyResult = await addProperty(property);
    
    if (!propertyResult.success) {
      throw propertyResult.error;
    }
    
    const propertyId = propertyResult.data.id;
    
    // Then add each item
    if (items.length > 0) {
      for (const item of items) {
        await addItemToProperty(propertyId, item);
      }
    }
    
    toast({
      title: "Propriedade adicionada com sucesso",
      description: `Casa #${property.number} foi adicionada com sucesso.`
    });
    
    return { success: true, data: propertyResult.data };
  } catch (error: any) {
    toast({
      title: "Erro ao adicionar propriedade",
      description: error.message,
      variant: "destructive"
    });
    
    return { success: false, error };
  }
};

export const updatePropertyItem = async (itemId: string, updates: Partial<Item>) => {
  try {
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
  } catch (error: any) {
    console.error("Erro ao atualizar item:", error.message);
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
  } catch (error: any) {
    console.error("Erro ao deletar item:", error.message);
    return { success: false, error };
  }
};

export const fetchPropertyTransactions = async (propertyId: string) => {
  try {
    const { data, error } = await supabase
      .from('property_transactions')
      .select('*')
      .eq('property_id', propertyId);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Erro ao buscar transações:", error.message);
    return { success: false, error };
  }
};

export const addPropertyTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  try {
    const { data, error } = await supabase
      .from('property_transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Erro ao adicionar transação:", error.message);
    return { success: false, error };
  }
};
