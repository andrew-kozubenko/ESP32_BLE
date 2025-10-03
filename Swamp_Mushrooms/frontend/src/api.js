import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

export async function getBeacons() {
    const res = await axios.get(`${API_URL}/beacons`);
    return res.data;
}

export async function getStandardPath() {
    const res = await axios.get(`${API_URL}/path/standard`);
    return res.data;
}

export async function getTrack(deviceId) {
    const res = await axios.get(`${API_URL}/tracks/${deviceId}`);
    return res.data;
}
