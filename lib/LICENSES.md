# Biblioteki i dane zewnętrzne (globus wyboru kraju, 0.16.6 S0)

- `globe.gl.min.js` — Globe.gl 2.32.1 (zawiera Three.js, osobny plik niepotrzebny), licencja MIT, https://github.com/vasturiano/globe.gl
- `../img/globus/*` — tekstury z pakietu `three-globe` 2.31.0 (MIT): `earth-night.jpg`, `earth-topology.png`, `night-sky.png`. Do sprawdzenia przy wdrożeniu: pochodzenie tekstury nocnej Ziemi (obrazy NASA Visible Earth, zwykle domena publiczna).
- `../data/kraje.geojson` — granice państw Natural Earth 1:110m (domena publiczna), z pliku `ne_110m_admin_0_countries.geojson` z repozytorium globe.gl; zostawione pola `NAME` i `ADM0_A3`, współrzędne zaokrąglone do 2 miejsc. Kraje rozpoznawać po `ADM0_A3` (np. `FRA`), bo `ISO_A2` ma wartość -99 dla Francji i Norwegii.
