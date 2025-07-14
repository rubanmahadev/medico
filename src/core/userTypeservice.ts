const USER_TYPE_KEY = 'userType';

export interface UserType {
  careTaker: boolean;
  patient: boolean;
}

export const setUserType = (type: UserType): void => {
  localStorage.setItem(USER_TYPE_KEY, JSON.stringify(type));
};

export const getUserType = (): UserType | null => {
  const data = localStorage.getItem(USER_TYPE_KEY);
  return data ? JSON.parse(data) as UserType : null;
};

export const clearUserType = (): void => {
  localStorage.removeItem(USER_TYPE_KEY);
};
