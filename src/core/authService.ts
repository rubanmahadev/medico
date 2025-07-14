import { supabase } from './supabase'; 

export const loginUser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  } catch (err) {
    return { data: null, error: { message: 'Unexpected error occurred' } };
  }
};
export const registerUser = async (email: string, password: string,userMeta:any={}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options : {
        data:userMeta
    }
    });

    return { data, error };
  } catch (err) {
    return { data: null, error: { message: 'Unexpected error occurred' } };
  }
};