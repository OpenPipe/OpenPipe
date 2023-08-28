import axios from 'axios';

export const deleteExperiment = async (id: string) => {
  if (!id) {
    throw new Error('Invalid id argument');
  }

  try {
    const response = await axios.delete(`/api/experiments/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
