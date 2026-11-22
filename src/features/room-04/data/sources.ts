import type { Source } from "../types";

export const SOURCES: Record<string, Source> = {
  telemedellin2026: { id: "telemedellin2026", kind: "prensa", label: "Telemedellín · «Murió Abraxas Aguilar, la mente detrás del museo del collage»", url: "https://telemedellin.tv/?p=201227", date: "2026-10-19" },
  elcolombiano2025: { id: "elcolombiano2025", kind: "prensa", label: "El Colombiano · Ángel Castaño Guzmán, «Este museo en el centro de Medellín tiene dos récords Guinness y está a punto de cerrar»", url: "https://www.elcolombiano.com/cultura/museo-guinness-medellin-cierre-NB30573691", date: "2025-11-04" },
  voa2024: { id: "voa2024", kind: "prensa", label: "Voz de América · «El collage más grande del mundo está en la ciudad colombiana de Medellín»", url: "https://www.vozdeamerica.com/a/el-collage-mas-grande-del-mundo-esta-en-la-ciudad-colombiana-de-medellin/7477700.html", date: "2024-02-08" },
  centropolis2020: { id: "centropolis2020", kind: "prensa", label: "Centrópolis · Vanesa Restrepo, «El museo del collage, un oasis en el centro»", url: "https://www.centropolismedellin.com/museo-del-collage-oasis-centro/", date: "2020-11-29" },
  galeria2011: { id: "galeria2011", kind: "prensa", label: "Galería Política · «Lady y Abraxas sí, Omar no»", url: "https://www.galeriapolitica.com/lady-y-abraxas-si-omar-no/", date: "2011-08-03" },
  pdba1998: { id: "pdba1998", kind: "base-de-datos", label: "Political Database of the Americas (Georgetown) · Elecciones presidenciales 1998, primera vuelta", url: "https://pdba.georgetown.edu/Elecdata/Col/pres98_1.html" },
  wiki1998: { id: "wiki1998", kind: "base-de-datos", label: "Wikipedia · 1998 Colombian presidential election", url: "https://en.wikipedia.org/wiki/1998_Colombian_presidential_election" },
  tesis2001: { id: "tesis2001", kind: "libro", label: "Betancur Aguilar, J. H. (2001). Por una ciudadanía global. Universidad Autónoma Latinoamericana" },
  prohibido: { id: "prohibido", kind: "libro", label: "Betancur A., J. H. — Abraxas. Prohibido perder (c. 1987, por verificar)" },
  guinnessCert: { id: "guinnessCert", kind: "archivo-foto", label: "Archivo Sala 04 · foto #638, certificado Récords Guinness" },
  tarjetonAlcaldia: { id: "tarjetonAlcaldia", kind: "archivo-foto", label: "Archivo Sala 04 · fotos #351 y #82, tarjetones pegados en el collage" },
  diploma: { id: "diploma", kind: "archivo-foto", label: "Archivo Sala 04 · foto #50, diploma de Abogado" },
  carpeta: { id: "carpeta", kind: "archivo-foto", label: "Archivo Sala 04 · foto #587, carpeta manuscrita" },
  recorte2025: { id: "recorte2025", kind: "archivo-foto", label: "Archivo Sala 04 · foto #460, recorte de El Colombiano en el escritorio" },
  manual: { id: "manual", kind: "documento", label: "Manual de identidad visual Museo Abraxas v0.3.1 (equipo)" },
};
