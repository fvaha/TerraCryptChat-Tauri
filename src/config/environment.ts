// Environment configuration for different deployment scenarios
export interface EnvironmentConfig {
  api_base_url: string;
  websocket_url: string;
  allowed_origins: string[];
  is_development: boolean;
  is_production: boolean;
}

// Development configuration
const development_config: EnvironmentConfig = {
  api_base_url: 'http://localhost:8080/api/v1',
  websocket_url: 'ws://localhost:8080/api/v1/ws',
  allowed_origins: ['http://localhost:4001', 'http://localhost:3000', 'http://localhost:5173'],
  is_development: true,
  is_production: false
};

// Production configuration
const production_config: EnvironmentConfig = {
  api_base_url: 'https://dev.v1.terracrypt.cc/api/v1',
  websocket_url: 'wss://dev.v1.terracrypt.cc/api/v1/ws',
  allowed_origins: ['https://terracrypt.cc', 'https://app.terracrypt.cc'],
  is_development: false,
  is_production: true
};

// Get current environment - browser only
function get_current_environment(): string {
  return window.location.hostname === 'localhost' ? 'development' : 'production';
}

// Export the appropriate configuration
export const environment_config: EnvironmentConfig = 
  get_current_environment() === 'production' ? production_config : development_config;

// Helper function to check if current origin is allowed
export function is_origin_allowed(origin: string): boolean {
  return environment_config.allowed_origins.includes(origin);
}

// Helper function to get API base URL
export function get_api_base_url(): string {
  return environment_config.api_base_url;
}

// Helper function to get WebSocket URL
export function get_websocket_url(): string {
  return environment_config.websocket_url;
}

// Export individual configs for direct access
export { development_config, production_config };
