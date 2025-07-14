import { supabase } from './supabase';

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single(); 

  return { data, error };
};
