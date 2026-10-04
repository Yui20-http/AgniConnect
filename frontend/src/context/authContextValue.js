import { createContext } from 'react';

// Shared stable context instance used by the provider and useAuth hook.
const AuthContextValue = createContext(null);

export default AuthContextValue;
