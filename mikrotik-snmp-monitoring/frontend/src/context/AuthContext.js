import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Action types
const AUTH_ACTION_TYPES = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER: 'LOAD_USER',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTION_TYPES.LOGIN_START:
    case AUTH_ACTION_TYPES.REGISTER_START:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case AUTH_ACTION_TYPES.LOGIN_SUCCESS:
    case AUTH_ACTION_TYPES.REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case AUTH_ACTION_TYPES.LOGIN_FAILURE:
    case AUTH_ACTION_TYPES.REGISTER_FAILURE:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };

    case AUTH_ACTION_TYPES.LOGOUT:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };

    case AUTH_ACTION_TYPES.LOAD_USER:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };

    case AUTH_ACTION_TYPES.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };

    case AUTH_ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on app start
  useEffect(() => {
    const loadUser = () => {
      try {
        const token = authService.getToken();
        const user = authService.getCurrentUser();

        if (token && user) {
          dispatch({
            type: AUTH_ACTION_TYPES.LOAD_USER,
            payload: { user, token },
          });
        } else {
          dispatch({ type: AUTH_ACTION_TYPES.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Error loading user:', error);
        dispatch({ type: AUTH_ACTION_TYPES.SET_LOADING, payload: false });
      }
    };

    loadUser();
  }, []);

  // Login action
  const login = async (loginData) => {
    try {
      dispatch({ type: AUTH_ACTION_TYPES.LOGIN_START });
      const response = await authService.login(loginData);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTION_TYPES.LOGIN_SUCCESS,
          payload: response.data,
        });
        return response;
      } else {
        dispatch({
          type: AUTH_ACTION_TYPES.LOGIN_FAILURE,
          payload: response.message || 'Login failed',
        });
        return response;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({
        type: AUTH_ACTION_TYPES.LOGIN_FAILURE,
        payload: errorMessage,
      });
      throw error;
    }
  };

  // Register action
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTION_TYPES.REGISTER_START });
      const response = await authService.register(userData);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTION_TYPES.REGISTER_SUCCESS,
          payload: response.data,
        });
        return response;
      } else {
        dispatch({
          type: AUTH_ACTION_TYPES.REGISTER_FAILURE,
          payload: response.message || 'Registration failed',
        });
        return response;
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTION_TYPES.REGISTER_FAILURE,
        payload: errorMessage,
      });
      throw error;
    }
  };

  // Logout action
  const logout = () => {
    authService.logout();
    dispatch({ type: AUTH_ACTION_TYPES.LOGOUT });
  };

  // Update user action
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTION_TYPES.UPDATE_USER,
      payload: userData,
    });
  };

  // Clear error action
  const clearError = () => {
    dispatch({ type: AUTH_ACTION_TYPES.CLEAR_ERROR });
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
