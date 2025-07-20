import { AxiosError } from 'axios';
import type { GetEdgesResponse, GetSchemaResponse } from '../../types/data-service';
import apiClient from '../../lib/apiClient';

/**
 * Fetches all edges from the data-service.
 * @returns A promise that resolves with the response from the /edges endpoint.
 * @throws An error if the API call fails.
 */
async function getEdges(): Promise<GetEdgesResponse> {
  try {
    // Make a GET request to the /edges endpoint
    // The generic <GetEdgesResponse> tells axios what type to expect for response.data
    const response = await apiClient.get<GetEdgesResponse>('/edges');

    // axios puts the actual JSON body in the `data` property
    return response.data;
  } catch (err) {
    // This provides much better error logging for network issues
    const error = err as AxiosError;
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(
        `Data service returned an error: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error(
        `No response received from data service at ${apiClient.defaults.baseURL}/edges`
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request to data service:', error.message);
    }
    // Re-throw a more generic error for the calling code to handle
    throw new Error('Failed to fetch edges from the data service.');
  }
}

/**
 * Fetches the entire graph schema from the data-service.
 * @returns A promise that resolves with the graph schema object.
 * @throws An error if the API call fails.
 */
async function getSchema(): Promise<GetSchemaResponse> {
  try {
    // Make a GET request to the /schema endpoint
    const response = await apiClient.get<GetSchemaResponse>('/schema');
    return response.data;
  } catch (err) {
    const error = err as AxiosError;
    if (error.response) {
      console.error(
        `Data service returned an error: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        `No response received from data service at ${apiClient.defaults.baseURL}/schema`
      );
    } else {
      console.error('Error setting up request to data service:', error.message);
    }
    throw new Error('Failed to fetch schema from the data service.');
  }
}

async function runQuery(query: string): Promise<string> {
  try {
    const response = await apiClient.post<string>('/query', { query: query })
    return JSON.stringify(response.data)
  } catch (err) {
    const error = err as AxiosError;
    if (error.response) {
      console.error(
        `Data service returned an error: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        `No response received from data service at ${apiClient.defaults.baseURL}/query`
      );
    } else {
      console.error('Error setting up request to data service:', error.message);
    }
    throw new Error('Failed to run query on the data service.');
  }
}

async function loadData(): Promise<string> {
  try {
    const response = await apiClient.post<string>("/load")
    return JSON.stringify(response.data)
  } catch (err) {
    const error = err as AxiosError;
    if (error.response) {
      console.error(
        `Data service returned an error: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        `No response received from data service at ${apiClient.defaults.baseURL}/load`
      );
    } else {
      console.error('Error setting up request to data service:', error.message);
    }
    throw new Error('Failed to load dummy data on the data service.');
  }
}

async function clearGraph(): Promise<string> {
  try {
    const response = await apiClient.post<string>("/clear")
    return JSON.stringify(response.data)
  } catch (err) {
    const error = err as AxiosError;
    if (error.response) {
      console.error(
        `Data service returned an error: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        `No response received from data service at ${apiClient.defaults.baseURL}/clear`
      );
    } else {
      console.error('Error setting up request to data service:', error.message);
    }
    throw new Error('Failed to clear data on the data service.');
  }
}

async function getVertices(): Promise<string> {
  try {
    const response = await apiClient.get<string>("/vertices")
    return JSON.stringify(response.data)
  } catch (err) {
    const error = err as AxiosError;
    if (error.response) {
      console.error(
        `Data service returned an error: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        `No response received from data service at ${apiClient.defaults.baseURL}/vertices`
      );
    } else {
      console.error('Error setting up request to data service:', error.message);
    }
    throw new Error('Failed to get vertices from the data service.');
  }
}

export const dataService = {
  GetEdges: (): Promise<GetEdgesResponse> => getEdges(),
  GetSchema: (): Promise<GetSchemaResponse> => getSchema(),
  RunQuery: (query: string): Promise<string> => runQuery(query),
  LoadData: (): Promise<string> => loadData(),
  ClearGraph: (): Promise<string> => clearGraph(),
  GetVertices: (): Promise<string> => getVertices(),
};

