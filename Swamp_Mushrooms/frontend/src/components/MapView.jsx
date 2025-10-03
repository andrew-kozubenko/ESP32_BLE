import React, { useEffect, useState } from "react";
import { MapContainer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getBeacons, getStandardPath, getTrack } from "../api";

// Компонент сетки, адаптивной к zoom и маякам
function GridLayer({ beacons }) {
    const map = useMap();

    useEffect(() => {
        const canvas = document.createElement("canvas");
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.pointerEvents = "none";
        map.getContainer().appendChild(canvas);
        const ctx = canvas.getContext("2d");

        function drawGrid() {
            const bounds = map.getBounds();
            const size = map.getSize();
            canvas.width = size.x;
            canvas.height = size.y;
            ctx.clearRect(0, 0, size.x, size.y);

            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.lineWidth = 1;
            ctx.font = "12px Arial";

            // Вычисляем минимальный и максимальный диапазон координат по маякам
            let latMin = bounds.getSouth(), latMax = bounds.getNorth();
            let lngMin = bounds.getWest(), lngMax = bounds.getEast();
            if (Object.keys(beacons).length > 0) {
                const lats = Object.values(beacons).map(b => b[1]);
                const lngs = Object.values(beacons).map(b => b[0]);
                latMin = Math.min(latMin, Math.min(...lats));
                latMax = Math.max(latMax, Math.max(...lats));
                lngMin = Math.min(lngMin, Math.min(...lngs));
                lngMax = Math.max(lngMax, Math.max(...lngs));
            }

            // Шаг сетки зависит от zoom карты
            const zoom = map.getZoom();
            const stepLat = 0.01 * Math.pow(2, 13 - zoom);
            const stepLng = 0.01 * Math.pow(2, 13 - zoom);

            // Горизонтальные линии
            for (let lat = Math.ceil(latMin / stepLat) * stepLat; lat <= latMax; lat += stepLat) {
                const y = map.latLngToContainerPoint([lat, lngMin]).y;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(size.x, y);
                ctx.stroke();
                ctx.fillText(lat.toFixed(4), 5, y - 2);
            }

            // Вертикальные линии
            for (let lng = Math.ceil(lngMin / stepLng) * stepLng; lng <= lngMax; lng += stepLng) {
                const x = map.latLngToContainerPoint([latMax, lng]).x;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, size.y);
                ctx.stroke();
                ctx.fillText(lng.toFixed(4), x + 2, 12);
            }
        }

        drawGrid();
        map.on("move zoom resize", drawGrid);

        return () => {
            map.off("move zoom resize", drawGrid);
            map.getContainer().removeChild(canvas);
        };
    }, [map, beacons]);

    return null;
}

export default function MapView() {
    const [beacons, setBeacons] = useState({});
    const [path, setPath] = useState([]);
    const [track, setTrack] = useState([]);

    useEffect(() => {
        getBeacons().then(setBeacons);
        getStandardPath().then(setPath);

        const interval = setInterval(() => {
            getTrack("tracker_1").then((data) => setTrack(data.track));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <MapContainer center={[55.0084, 82.9357]} zoom={13} style={{ height: "90vh", width: "100%" }}>
            <GridLayer beacons={beacons} />

            {/* маяки */}
            {Object.entries(beacons).map(([id, coords]) => (
                <CircleMarker key={id} center={[coords[1], coords[0]]} radius={6} color="blue">
                    <Tooltip direction="top" offset={[0, -10]}>
                        <div>
                            <strong>{id}</strong>
                            <br />
                            X: {coords[0].toFixed(6)}, Y: {coords[1].toFixed(6)}
                        </div>
                    </Tooltip>
                </CircleMarker>
            ))}

            {/* эталонный маршрут */}
            {path.length > 0 && <Polyline positions={path.map((p) => [p.y, p.x])} color="green" dashArray="5,5" />}

            {/* реальный трек */}
            {track.length > 0 && (
                <>
                    <Polyline positions={track.map((p) => [p.y, p.x])} color="red" />
                    <CircleMarker center={[track.at(-1).y, track.at(-1).x]} radius={8} color="red">
                        <Tooltip>Tracker_1</Tooltip>
                    </CircleMarker>
                </>
            )}
        </MapContainer>
    );
}
