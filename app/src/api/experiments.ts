import axios from 'axios';

export const deleteExperiment = async (id: string) => {
  try {
    const response = await axios.delete(`/api/experiments/${id}`);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};
