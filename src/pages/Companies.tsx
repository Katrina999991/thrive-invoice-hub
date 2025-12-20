import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, X, Percent, User, Send, Upload, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCompanies } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

type Company = Tables<"companies">;

// Listes de pays et provinces/états
const COUNTRIES = [
  { value: "Afghanistan", label: "Afghanistan" },
  { value: "Albania", label: "Albania" },
  { value: "Algeria", label: "Algeria" },
  { value: "Andorra", label: "Andorra" },
  { value: "Angola", label: "Angola" },
  { value: "Antigua and Barbuda", label: "Antigua and Barbuda" },
  { value: "Argentina", label: "Argentina" },
  { value: "Armenia", label: "Armenia" },
  { value: "Australia", label: "Australia" },
  { value: "Austria", label: "Austria" },
  { value: "Azerbaijan", label: "Azerbaijan" },
  { value: "Bahamas", label: "Bahamas" },
  { value: "Bahrain", label: "Bahrain" },
  { value: "Bangladesh", label: "Bangladesh" },
  { value: "Barbados", label: "Barbados" },
  { value: "Belarus", label: "Belarus" },
  { value: "Belgium", label: "Belgium" },
  { value: "Belize", label: "Belize" },
  { value: "Benin", label: "Benin" },
  { value: "Bhutan", label: "Bhutan" },
  { value: "Bolivia", label: "Bolivia" },
  { value: "Bosnia and Herzegovina", label: "Bosnia and Herzegovina" },
  { value: "Botswana", label: "Botswana" },
  { value: "Brazil", label: "Brazil" },
  { value: "Brunei", label: "Brunei" },
  { value: "Bulgaria", label: "Bulgaria" },
  { value: "Burkina Faso", label: "Burkina Faso" },
  { value: "Burundi", label: "Burundi" },
  { value: "Cabo Verde", label: "Cabo Verde" },
  { value: "Cambodia", label: "Cambodia" },
  { value: "Cameroon", label: "Cameroon" },
  { value: "Canada", label: "Canada" },
  { value: "Central African Republic", label: "Central African Republic" },
  { value: "Chad", label: "Chad" },
  { value: "Chile", label: "Chile" },
  { value: "China", label: "China" },
  { value: "Colombia", label: "Colombia" },
  { value: "Comoros", label: "Comoros" },
  { value: "Congo", label: "Congo" },
  { value: "Costa Rica", label: "Costa Rica" },
  { value: "Croatia", label: "Croatia" },
  { value: "Cuba", label: "Cuba" },
  { value: "Cyprus", label: "Cyprus" },
  { value: "Czech Republic", label: "Czech Republic" },
  { value: "Denmark", label: "Denmark" },
  { value: "Djibouti", label: "Djibouti" },
  { value: "Dominica", label: "Dominica" },
  { value: "Dominican Republic", label: "Dominican Republic" },
  { value: "East Timor", label: "East Timor" },
  { value: "Ecuador", label: "Ecuador" },
  { value: "Egypt", label: "Egypt" },
  { value: "El Salvador", label: "El Salvador" },
  { value: "Equatorial Guinea", label: "Equatorial Guinea" },
  { value: "Eritrea", label: "Eritrea" },
  { value: "Estonia", label: "Estonia" },
  { value: "Eswatini", label: "Eswatini" },
  { value: "Ethiopia", label: "Ethiopia" },
  { value: "Fiji", label: "Fiji" },
  { value: "Finland", label: "Finland" },
  { value: "France", label: "France" },
  { value: "Gabon", label: "Gabon" },
  { value: "Gambia", label: "Gambia" },
  { value: "Georgia", label: "Georgia" },
  { value: "Germany", label: "Germany" },
  { value: "Ghana", label: "Ghana" },
  { value: "Greece", label: "Greece" },
  { value: "Grenada", label: "Grenada" },
  { value: "Guatemala", label: "Guatemala" },
  { value: "Guinea", label: "Guinea" },
  { value: "Guinea-Bissau", label: "Guinea-Bissau" },
  { value: "Guyana", label: "Guyana" },
  { value: "Haiti", label: "Haiti" },
  { value: "Honduras", label: "Honduras" },
  { value: "Hungary", label: "Hungary" },
  { value: "Iceland", label: "Iceland" },
  { value: "India", label: "India" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Iran", label: "Iran" },
  { value: "Iraq", label: "Iraq" },
  { value: "Ireland", label: "Ireland" },
  { value: "Israel", label: "Israel" },
  { value: "Italy", label: "Italy" },
  { value: "Ivory Coast", label: "Ivory Coast" },
  { value: "Jamaica", label: "Jamaica" },
  { value: "Japan", label: "Japan" },
  { value: "Jordan", label: "Jordan" },
  { value: "Kazakhstan", label: "Kazakhstan" },
  { value: "Kenya", label: "Kenya" },
  { value: "Kiribati", label: "Kiribati" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Kyrgyzstan", label: "Kyrgyzstan" },
  { value: "Laos", label: "Laos" },
  { value: "Latvia", label: "Latvia" },
  { value: "Lebanon", label: "Lebanon" },
  { value: "Lesotho", label: "Lesotho" },
  { value: "Liberia", label: "Liberia" },
  { value: "Libya", label: "Libya" },
  { value: "Liechtenstein", label: "Liechtenstein" },
  { value: "Lithuania", label: "Lithuania" },
  { value: "Luxembourg", label: "Luxembourg" },
  { value: "Madagascar", label: "Madagascar" },
  { value: "Malawi", label: "Malawi" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Maldives", label: "Maldives" },
  { value: "Mali", label: "Mali" },
  { value: "Malta", label: "Malta" },
  { value: "Marshall Islands", label: "Marshall Islands" },
  { value: "Mauritania", label: "Mauritania" },
  { value: "Mauritius", label: "Mauritius" },
  { value: "Mexico", label: "Mexico" },
  { value: "Micronesia", label: "Micronesia" },
  { value: "Moldova", label: "Moldova" },
  { value: "Monaco", label: "Monaco" },
  { value: "Mongolia", label: "Mongolia" },
  { value: "Montenegro", label: "Montenegro" },
  { value: "Morocco", label: "Morocco" },
  { value: "Mozambique", label: "Mozambique" },
  { value: "Myanmar", label: "Myanmar" },
  { value: "Namibia", label: "Namibia" },
  { value: "Nauru", label: "Nauru" },
  { value: "Nepal", label: "Nepal" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "Nicaragua", label: "Nicaragua" },
  { value: "Niger", label: "Niger" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "North Korea", label: "North Korea" },
  { value: "North Macedonia", label: "North Macedonia" },
  { value: "Norway", label: "Norway" },
  { value: "Oman", label: "Oman" },
  { value: "Pakistan", label: "Pakistan" },
  { value: "Palau", label: "Palau" },
  { value: "Palestine", label: "Palestine" },
  { value: "Panama", label: "Panama" },
  { value: "Papua New Guinea", label: "Papua New Guinea" },
  { value: "Paraguay", label: "Paraguay" },
  { value: "Peru", label: "Peru" },
  { value: "Philippines", label: "Philippines" },
  { value: "Poland", label: "Poland" },
  { value: "Portugal", label: "Portugal" },
  { value: "Qatar", label: "Qatar" },
  { value: "Romania", label: "Romania" },
  { value: "Russia", label: "Russia" },
  { value: "Rwanda", label: "Rwanda" },
  { value: "Saint Kitts and Nevis", label: "Saint Kitts and Nevis" },
  { value: "Saint Lucia", label: "Saint Lucia" },
  { value: "Saint Vincent and the Grenadines", label: "Saint Vincent and the Grenadines" },
  { value: "Samoa", label: "Samoa" },
  { value: "San Marino", label: "San Marino" },
  { value: "Sao Tome and Principe", label: "Sao Tome and Principe" },
  { value: "Saudi Arabia", label: "Saudi Arabia" },
  { value: "Senegal", label: "Senegal" },
  { value: "Serbia", label: "Serbia" },
  { value: "Seychelles", label: "Seychelles" },
  { value: "Sierra Leone", label: "Sierra Leone" },
  { value: "Singapore", label: "Singapore" },
  { value: "Slovakia", label: "Slovakia" },
  { value: "Slovenia", label: "Slovenia" },
  { value: "Solomon Islands", label: "Solomon Islands" },
  { value: "Somalia", label: "Somalia" },
  { value: "South Africa", label: "South Africa" },
  { value: "South Korea", label: "South Korea" },
  { value: "South Sudan", label: "South Sudan" },
  { value: "Spain", label: "Spain" },
  { value: "Sri Lanka", label: "Sri Lanka" },
  { value: "Sudan", label: "Sudan" },
  { value: "Suriname", label: "Suriname" },
  { value: "Sweden", label: "Sweden" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "Syria", label: "Syria" },
  { value: "Taiwan", label: "Taiwan" },
  { value: "Tajikistan", label: "Tajikistan" },
  { value: "Tanzania", label: "Tanzania" },
  { value: "Thailand", label: "Thailand" },
  { value: "Togo", label: "Togo" },
  { value: "Tonga", label: "Tonga" },
  { value: "Trinidad and Tobago", label: "Trinidad and Tobago" },
  { value: "Tunisia", label: "Tunisia" },
  { value: "Turkey", label: "Turkey" },
  { value: "Turkmenistan", label: "Turkmenistan" },
  { value: "Tuvalu", label: "Tuvalu" },
  { value: "Uganda", label: "Uganda" },
  { value: "Ukraine", label: "Ukraine" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United States", label: "United States" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Uzbekistan", label: "Uzbekistan" },
  { value: "Vanuatu", label: "Vanuatu" },
  { value: "Vatican City", label: "Vatican City" },
  { value: "Venezuela", label: "Venezuela" },
  { value: "Vietnam", label: "Vietnam" },
  { value: "Yemen", label: "Yemen" },
  { value: "Zambia", label: "Zambia" },
  { value: "Zimbabwe", label: "Zimbabwe" }
];

const CANADA_PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "YT", label: "Yukon" }
];

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

const FRANCE_REGIONS = [
  { value: "Auvergne-Rhône-Alpes", label: "Auvergne-Rhône-Alpes" },
  { value: "Bourgogne-Franche-Comté", label: "Bourgogne-Franche-Comté" },
  { value: "Bretagne", label: "Bretagne" },
  { value: "Centre-Val de Loire", label: "Centre-Val de Loire" },
  { value: "Corse", label: "Corse" },
  { value: "Grand Est", label: "Grand Est" },
  { value: "Hauts-de-France", label: "Hauts-de-France" },
  { value: "Île-de-France", label: "Île-de-France" },
  { value: "Normandie", label: "Normandie" },
  { value: "Nouvelle-Aquitaine", label: "Nouvelle-Aquitaine" },
  { value: "Occitanie", label: "Occitanie" },
  { value: "Pays de la Loire", label: "Pays de la Loire" },
  { value: "Provence-Alpes-Côte d'Azur", label: "Provence-Alpes-Côte d'Azur" }
];

const UK_REGIONS = [
  { value: "England", label: "England" },
  { value: "Scotland", label: "Scotland" },
  { value: "Wales", label: "Wales" },
  { value: "Northern Ireland", label: "Northern Ireland" }
];

const GERMANY_STATES = [
  { value: "Baden-Württemberg", label: "Baden-Württemberg" },
  { value: "Bavaria", label: "Bavaria" },
  { value: "Berlin", label: "Berlin" },
  { value: "Brandenburg", label: "Brandenburg" },
  { value: "Bremen", label: "Bremen" },
  { value: "Hamburg", label: "Hamburg" },
  { value: "Hesse", label: "Hesse" },
  { value: "Lower Saxony", label: "Lower Saxony" },
  { value: "Mecklenburg-Vorpommern", label: "Mecklenburg-Vorpommern" },
  { value: "North Rhine-Westphalia", label: "North Rhine-Westphalia" },
  { value: "Rhineland-Palatinate", label: "Rhineland-Palatinate" },
  { value: "Saarland", label: "Saarland" },
  { value: "Saxony", label: "Saxony" },
  { value: "Saxony-Anhalt", label: "Saxony-Anhalt" },
  { value: "Schleswig-Holstein", label: "Schleswig-Holstein" },
  { value: "Thuringia", label: "Thuringia" }
];

const SPAIN_REGIONS = [
  { value: "Andalusia", label: "Andalusia" },
  { value: "Aragon", label: "Aragon" },
  { value: "Asturias", label: "Asturias" },
  { value: "Balearic Islands", label: "Balearic Islands" },
  { value: "Basque Country", label: "Basque Country" },
  { value: "Canary Islands", label: "Canary Islands" },
  { value: "Cantabria", label: "Cantabria" },
  { value: "Castile and León", label: "Castile and León" },
  { value: "Castile-La Mancha", label: "Castile-La Mancha" },
  { value: "Catalonia", label: "Catalonia" },
  { value: "Extremadura", label: "Extremadura" },
  { value: "Galicia", label: "Galicia" },
  { value: "La Rioja", label: "La Rioja" },
  { value: "Madrid", label: "Madrid" },
  { value: "Murcia", label: "Murcia" },
  { value: "Navarre", label: "Navarre" },
  { value: "Valencia", label: "Valencia" }
];

const ITALY_REGIONS = [
  { value: "Abruzzo", label: "Abruzzo" },
  { value: "Aosta Valley", label: "Aosta Valley" },
  { value: "Apulia", label: "Apulia" },
  { value: "Basilicata", label: "Basilicata" },
  { value: "Calabria", label: "Calabria" },
  { value: "Campania", label: "Campania" },
  { value: "Emilia-Romagna", label: "Emilia-Romagna" },
  { value: "Friuli-Venezia Giulia", label: "Friuli-Venezia Giulia" },
  { value: "Lazio", label: "Lazio" },
  { value: "Liguria", label: "Liguria" },
  { value: "Lombardy", label: "Lombardy" },
  { value: "Marche", label: "Marche" },
  { value: "Molise", label: "Molise" },
  { value: "Piedmont", label: "Piedmont" },
  { value: "Sardinia", label: "Sardinia" },
  { value: "Sicily", label: "Sicily" },
  { value: "Trentino-South Tyrol", label: "Trentino-South Tyrol" },
  { value: "Tuscany", label: "Tuscany" },
  { value: "Umbria", label: "Umbria" },
  { value: "Veneto", label: "Veneto" }
];

const MEXICO_STATES = [
  { value: "Aguascalientes", label: "Aguascalientes" },
  { value: "Baja California", label: "Baja California" },
  { value: "Baja California Sur", label: "Baja California Sur" },
  { value: "Campeche", label: "Campeche" },
  { value: "Chiapas", label: "Chiapas" },
  { value: "Chihuahua", label: "Chihuahua" },
  { value: "Coahuila", label: "Coahuila" },
  { value: "Colima", label: "Colima" },
  { value: "Durango", label: "Durango" },
  { value: "Guanajuato", label: "Guanajuato" },
  { value: "Guerrero", label: "Guerrero" },
  { value: "Hidalgo", label: "Hidalgo" },
  { value: "Jalisco", label: "Jalisco" },
  { value: "Mexico City", label: "Mexico City" },
  { value: "Mexico State", label: "Mexico State" },
  { value: "Michoacán", label: "Michoacán" },
  { value: "Morelos", label: "Morelos" },
  { value: "Nayarit", label: "Nayarit" },
  { value: "Nuevo León", label: "Nuevo León" },
  { value: "Oaxaca", label: "Oaxaca" },
  { value: "Puebla", label: "Puebla" },
  { value: "Querétaro", label: "Querétaro" },
  { value: "Quintana Roo", label: "Quintana Roo" },
  { value: "San Luis Potosí", label: "San Luis Potosí" },
  { value: "Sinaloa", label: "Sinaloa" },
  { value: "Sonora", label: "Sonora" },
  { value: "Tabasco", label: "Tabasco" },
  { value: "Tamaulipas", label: "Tamaulipas" },
  { value: "Tlaxcala", label: "Tlaxcala" },
  { value: "Veracruz", label: "Veracruz" },
  { value: "Yucatán", label: "Yucatán" },
  { value: "Zacatecas", label: "Zacatecas" }
];

const BRAZIL_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" }
];

const AUSTRALIA_STATES = [
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NSW", label: "New South Wales" },
  { value: "NT", label: "Northern Territory" },
  { value: "QLD", label: "Queensland" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "VIC", label: "Victoria" },
  { value: "WA", label: "Western Australia" }
];

const INDIA_STATES = [
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
  { value: "Assam", label: "Assam" },
  { value: "Bihar", label: "Bihar" },
  { value: "Chhattisgarh", label: "Chhattisgarh" },
  { value: "Goa", label: "Goa" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Haryana", label: "Haryana" },
  { value: "Himachal Pradesh", label: "Himachal Pradesh" },
  { value: "Jharkhand", label: "Jharkhand" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Kerala", label: "Kerala" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Manipur", label: "Manipur" },
  { value: "Meghalaya", label: "Meghalaya" },
  { value: "Mizoram", label: "Mizoram" },
  { value: "Nagaland", label: "Nagaland" },
  { value: "Odisha", label: "Odisha" },
  { value: "Punjab", label: "Punjab" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Sikkim", label: "Sikkim" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tripura", label: "Tripura" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Uttarakhand", label: "Uttarakhand" },
  { value: "West Bengal", label: "West Bengal" }
];

const CHINA_PROVINCES = [
  { value: "Anhui", label: "Anhui" },
  { value: "Beijing", label: "Beijing" },
  { value: "Chongqing", label: "Chongqing" },
  { value: "Fujian", label: "Fujian" },
  { value: "Gansu", label: "Gansu" },
  { value: "Guangdong", label: "Guangdong" },
  { value: "Guangxi", label: "Guangxi" },
  { value: "Guizhou", label: "Guizhou" },
  { value: "Hainan", label: "Hainan" },
  { value: "Hebei", label: "Hebei" },
  { value: "Heilongjiang", label: "Heilongjiang" },
  { value: "Henan", label: "Henan" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Hubei", label: "Hubei" },
  { value: "Hunan", label: "Hunan" },
  { value: "Inner Mongolia", label: "Inner Mongolia" },
  { value: "Jiangsu", label: "Jiangsu" },
  { value: "Jiangxi", label: "Jiangxi" },
  { value: "Jilin", label: "Jilin" },
  { value: "Liaoning", label: "Liaoning" },
  { value: "Macau", label: "Macau" },
  { value: "Ningxia", label: "Ningxia" },
  { value: "Qinghai", label: "Qinghai" },
  { value: "Shaanxi", label: "Shaanxi" },
  { value: "Shandong", label: "Shandong" },
  { value: "Shanghai", label: "Shanghai" },
  { value: "Shanxi", label: "Shanxi" },
  { value: "Sichuan", label: "Sichuan" },
  { value: "Tianjin", label: "Tianjin" },
  { value: "Tibet", label: "Tibet" },
  { value: "Xinjiang", label: "Xinjiang" },
  { value: "Yunnan", label: "Yunnan" },
  { value: "Zhejiang", label: "Zhejiang" }
];

const JAPAN_PREFECTURES = [
  { value: "Aichi", label: "Aichi" },
  { value: "Akita", label: "Akita" },
  { value: "Aomori", label: "Aomori" },
  { value: "Chiba", label: "Chiba" },
  { value: "Ehime", label: "Ehime" },
  { value: "Fukui", label: "Fukui" },
  { value: "Fukuoka", label: "Fukuoka" },
  { value: "Fukushima", label: "Fukushima" },
  { value: "Gifu", label: "Gifu" },
  { value: "Gunma", label: "Gunma" },
  { value: "Hiroshima", label: "Hiroshima" },
  { value: "Hokkaido", label: "Hokkaido" },
  { value: "Hyogo", label: "Hyogo" },
  { value: "Ibaraki", label: "Ibaraki" },
  { value: "Ishikawa", label: "Ishikawa" },
  { value: "Iwate", label: "Iwate" },
  { value: "Kagawa", label: "Kagawa" },
  { value: "Kagoshima", label: "Kagoshima" },
  { value: "Kanagawa", label: "Kanagawa" },
  { value: "Kochi", label: "Kochi" },
  { value: "Kumamoto", label: "Kumamoto" },
  { value: "Kyoto", label: "Kyoto" },
  { value: "Mie", label: "Mie" },
  { value: "Miyagi", label: "Miyagi" },
  { value: "Miyazaki", label: "Miyazaki" },
  { value: "Nagano", label: "Nagano" },
  { value: "Nagasaki", label: "Nagasaki" },
  { value: "Nara", label: "Nara" },
  { value: "Niigata", label: "Niigata" },
  { value: "Oita", label: "Oita" },
  { value: "Okayama", label: "Okayama" },
  { value: "Okinawa", label: "Okinawa" },
  { value: "Osaka", label: "Osaka" },
  { value: "Saga", label: "Saga" },
  { value: "Saitama", label: "Saitama" },
  { value: "Shiga", label: "Shiga" },
  { value: "Shimane", label: "Shimane" },
  { value: "Shizuoka", label: "Shizuoka" },
  { value: "Tochigi", label: "Tochigi" },
  { value: "Tokushima", label: "Tokushima" },
  { value: "Tokyo", label: "Tokyo" },
  { value: "Tottori", label: "Tottori" },
  { value: "Toyama", label: "Toyama" },
  { value: "Wakayama", label: "Wakayama" },
  { value: "Yamagata", label: "Yamagata" },
  { value: "Yamaguchi", label: "Yamaguchi" },
  { value: "Yamanashi", label: "Yamanashi" }
];

const RUSSIA_REGIONS = [
  { value: "Moscow", label: "Moscow" },
  { value: "Saint Petersburg", label: "Saint Petersburg" },
  { value: "Novosibirsk", label: "Novosibirsk" },
  { value: "Yekaterinburg", label: "Yekaterinburg" },
  { value: "Kazan", label: "Kazan" },
  { value: "Nizhny Novgorod", label: "Nizhny Novgorod" },
  { value: "Chelyabinsk", label: "Chelyabinsk" },
  { value: "Samara", label: "Samara" },
  { value: "Omsk", label: "Omsk" },
  { value: "Rostov-on-Don", label: "Rostov-on-Don" },
  { value: "Ufa", label: "Ufa" },
  { value: "Krasnoyarsk", label: "Krasnoyarsk" },
  { value: "Voronezh", label: "Voronezh" },
  { value: "Perm", label: "Perm" },
  { value: "Volgograd", label: "Volgograd" }
];

const ARGENTINA_PROVINCES = [
  { value: "Buenos Aires", label: "Buenos Aires" },
  { value: "Catamarca", label: "Catamarca" },
  { value: "Chaco", label: "Chaco" },
  { value: "Chubut", label: "Chubut" },
  { value: "Córdoba", label: "Córdoba" },
  { value: "Corrientes", label: "Corrientes" },
  { value: "Entre Ríos", label: "Entre Ríos" },
  { value: "Formosa", label: "Formosa" },
  { value: "Jujuy", label: "Jujuy" },
  { value: "La Pampa", label: "La Pampa" },
  { value: "La Rioja", label: "La Rioja" },
  { value: "Mendoza", label: "Mendoza" },
  { value: "Misiones", label: "Misiones" },
  { value: "Neuquén", label: "Neuquén" },
  { value: "Río Negro", label: "Río Negro" },
  { value: "Salta", label: "Salta" },
  { value: "San Juan", label: "San Juan" },
  { value: "San Luis", label: "San Luis" },
  { value: "Santa Cruz", label: "Santa Cruz" },
  { value: "Santa Fe", label: "Santa Fe" },
  { value: "Santiago del Estero", label: "Santiago del Estero" },
  { value: "Tierra del Fuego", label: "Tierra del Fuego" },
  { value: "Tucumán", label: "Tucumán" }
];

const SOUTH_AFRICA_PROVINCES = [
  { value: "Eastern Cape", label: "Eastern Cape" },
  { value: "Free State", label: "Free State" },
  { value: "Gauteng", label: "Gauteng" },
  { value: "KwaZulu-Natal", label: "KwaZulu-Natal" },
  { value: "Limpopo", label: "Limpopo" },
  { value: "Mpumalanga", label: "Mpumalanga" },
  { value: "North West", label: "North West" },
  { value: "Northern Cape", label: "Northern Cape" },
  { value: "Western Cape", label: "Western Cape" }
];

const NETHERLANDS_PROVINCES = [
  { value: "Drenthe", label: "Drenthe" },
  { value: "Flevoland", label: "Flevoland" },
  { value: "Friesland", label: "Friesland" },
  { value: "Gelderland", label: "Gelderland" },
  { value: "Groningen", label: "Groningen" },
  { value: "Limburg", label: "Limburg" },
  { value: "North Brabant", label: "North Brabant" },
  { value: "North Holland", label: "North Holland" },
  { value: "Overijssel", label: "Overijssel" },
  { value: "South Holland", label: "South Holland" },
  { value: "Utrecht", label: "Utrecht" },
  { value: "Zeeland", label: "Zeeland" }
];

const BELGIUM_REGIONS = [
  { value: "Brussels", label: "Brussels" },
  { value: "Flanders", label: "Flanders" },
  { value: "Wallonia", label: "Wallonia" }
];

const SWITZERLAND_CANTONS = [
  { value: "Aargau", label: "Aargau" },
  { value: "Appenzell Ausserrhoden", label: "Appenzell Ausserrhoden" },
  { value: "Appenzell Innerrhoden", label: "Appenzell Innerrhoden" },
  { value: "Basel-Landschaft", label: "Basel-Landschaft" },
  { value: "Basel-Stadt", label: "Basel-Stadt" },
  { value: "Bern", label: "Bern" },
  { value: "Fribourg", label: "Fribourg" },
  { value: "Geneva", label: "Geneva" },
  { value: "Glarus", label: "Glarus" },
  { value: "Graubünden", label: "Graubünden" },
  { value: "Jura", label: "Jura" },
  { value: "Lucerne", label: "Lucerne" },
  { value: "Neuchâtel", label: "Neuchâtel" },
  { value: "Nidwalden", label: "Nidwalden" },
  { value: "Obwalden", label: "Obwalden" },
  { value: "Schaffhausen", label: "Schaffhausen" },
  { value: "Schwyz", label: "Schwyz" },
  { value: "Solothurn", label: "Solothurn" },
  { value: "St. Gallen", label: "St. Gallen" },
  { value: "Thurgau", label: "Thurgau" },
  { value: "Ticino", label: "Ticino" },
  { value: "Uri", label: "Uri" },
  { value: "Valais", label: "Valais" },
  { value: "Vaud", label: "Vaud" },
  { value: "Zug", label: "Zug" },
  { value: "Zurich", label: "Zurich" }
];

const AUSTRIA_STATES = [
  { value: "Burgenland", label: "Burgenland" },
  { value: "Carinthia", label: "Carinthia" },
  { value: "Lower Austria", label: "Lower Austria" },
  { value: "Upper Austria", label: "Upper Austria" },
  { value: "Salzburg", label: "Salzburg" },
  { value: "Styria", label: "Styria" },
  { value: "Tyrol", label: "Tyrol" },
  { value: "Vorarlberg", label: "Vorarlberg" },
  { value: "Vienna", label: "Vienna" }
];

const PORTUGAL_DISTRICTS = [
  { value: "Aveiro", label: "Aveiro" },
  { value: "Beja", label: "Beja" },
  { value: "Braga", label: "Braga" },
  { value: "Bragança", label: "Bragança" },
  { value: "Castelo Branco", label: "Castelo Branco" },
  { value: "Coimbra", label: "Coimbra" },
  { value: "Évora", label: "Évora" },
  { value: "Faro", label: "Faro" },
  { value: "Guarda", label: "Guarda" },
  { value: "Leiria", label: "Leiria" },
  { value: "Lisbon", label: "Lisbon" },
  { value: "Portalegre", label: "Portalegre" },
  { value: "Porto", label: "Porto" },
  { value: "Santarém", label: "Santarém" },
  { value: "Setúbal", label: "Setúbal" },
  { value: "Viana do Castelo", label: "Viana do Castelo" },
  { value: "Vila Real", label: "Vila Real" },
  { value: "Viseu", label: "Viseu" }
];

const POLAND_VOIVODESHIPS = [
  { value: "Greater Poland", label: "Greater Poland" },
  { value: "Kuyavian-Pomeranian", label: "Kuyavian-Pomeranian" },
  { value: "Lesser Poland", label: "Lesser Poland" },
  { value: "Lodz", label: "Lodz" },
  { value: "Lower Silesian", label: "Lower Silesian" },
  { value: "Lublin", label: "Lublin" },
  { value: "Lubusz", label: "Lubusz" },
  { value: "Masovian", label: "Masovian" },
  { value: "Opole", label: "Opole" },
  { value: "Podkarpackie", label: "Podkarpackie" },
  { value: "Podlaskie", label: "Podlaskie" },
  { value: "Pomeranian", label: "Pomeranian" },
  { value: "Silesian", label: "Silesian" },
  { value: "Swietokrzyskie", label: "Swietokrzyskie" },
  { value: "Warmian-Masurian", label: "Warmian-Masurian" },
  { value: "West Pomeranian", label: "West Pomeranian" }
];

// Helper function to get regions for a country
const getRegionsForCountry = (country: string) => {
  switch (country) {
    case "Canada":
      return CANADA_PROVINCES;
    case "United States":
      return US_STATES;
    case "France":
      return FRANCE_REGIONS;
    case "United Kingdom":
      return UK_REGIONS;
    case "Germany":
      return GERMANY_STATES;
    case "Spain":
      return SPAIN_REGIONS;
    case "Italy":
      return ITALY_REGIONS;
    case "Mexico":
      return MEXICO_STATES;
    case "Brazil":
      return BRAZIL_STATES;
    case "Australia":
      return AUSTRALIA_STATES;
    case "India":
      return INDIA_STATES;
    case "China":
      return CHINA_PROVINCES;
    case "Japan":
      return JAPAN_PREFECTURES;
    case "Russia":
      return RUSSIA_REGIONS;
    case "Argentina":
      return ARGENTINA_PROVINCES;
    case "South Africa":
      return SOUTH_AFRICA_PROVINCES;
    case "Netherlands":
      return NETHERLANDS_PROVINCES;
    case "Belgium":
      return BELGIUM_REGIONS;
    case "Switzerland":
      return SWITZERLAND_CANTONS;
    case "Austria":
      return AUSTRIA_STATES;
    case "Portugal":
      return PORTUGAL_DISTRICTS;
    case "Poland":
      return POLAND_VOIVODESHIPS;
    default:
      return null;
  }
};

const Companies = () => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();
  const { checkLimit, planLimits } = useSubscription();
  const navigate = useNavigate();

  // Helper function to format complete address
  const formatAddress = (company: Company) => {
    const parts = [];
    
    if ((company as any).street_address) {
      parts.push((company as any).street_address);
    }
    
    const cityProvince = [];
    if ((company as any).city) {
      cityProvince.push((company as any).city);
    }
    if ((company as any).province_state) {
      cityProvince.push((company as any).province_state);
    }
    if (cityProvince.length > 0) {
      parts.push(cityProvince.join(', '));
    }
    
    if ((company as any).postal_code) {
      parts.push((company as any).postal_code);
    }
    
    if ((company as any).country && (company as any).country !== 'Canada') {
      parts.push((company as any).country);
    }
    
    // Fallback to legacy address field if new fields are empty
    if (parts.length === 0 && company.address) {
      return company.address;
    }
    
    return parts.join(', ');
  };

  const [newCompany, setNewCompany] = useState({
    name: "",
    address: "",
    street_address: "",
    city: "",
    province_state: "",
    postal_code: "",
    country: "Canada",
    phone: "",
    email: "",
    website: "",
    tax_id: "",
    contact_person: "",
    logo_url: "",
    default_due_days: 7,
    invoice_email_subject: "Invoice {invoice_number} from {company_name}",
    invoice_email_message: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${"{total}"}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
    overdue_email_subject: "Payment Overdue - Invoice {invoice_number}",
    overdue_email_message: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${"{total}"}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
    payment_confirmation_email_subject: "Payment Confirmation - Invoice {invoice_number}",
    payment_confirmation_email_message: `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: ${"{total}"}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
    invoice_footer_message: "Thank you for your business!",
    invoice_footer_message_fr: "Merci pour votre confiance !",
    invoice_body_message: "",
    invoice_body_message_fr: ""
  });

  const [taxes, setTaxes] = useState<Array<{name: string, percentage: number}>>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  const addTax = () => {
    setTaxes([...taxes, { name: "", percentage: 0 }]);
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const updateTax = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setTaxes(newTaxes);
  };

  const validateInvoiceNumbering = async (): Promise<boolean> => {
    try {
      // Get all existing invoices to check for conflicts
      const { data: existingInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('invoice_number');

      if (invoicesError) throw invoicesError;

      // Get all companies except the one being edited
      const otherCompanies = companies.filter(c => !editingCompany || c.id !== editingCompany.id);

      return true;
    } catch (error) {
      console.error('Error validating invoice numbering:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate tax names - all taxes must have a name
    const taxesWithEmptyNames = taxes.filter(tax => !tax.name || tax.name.trim() === '');
    if (taxesWithEmptyNames.length > 0) {
      toast({
        title: language === 'fr' ? "Nom de taxe requis" : "Tax name required",
        description: language === 'fr' 
          ? "Veuillez entrer un nom pour chaque taxe" 
          : "Please enter a name for each tax",
        variant: "destructive"
      });
      return;
    }

    setUploadingLogo(true);

    // Validate invoice numbering configuration
    const isValid = await validateInvoiceNumbering();
    if (!isValid) {
      setUploadingLogo(false);
      return;
    }
    
    let logoUrl = newCompany.logo_url;
    
    // Upload logo if a new file is selected
    if (logoFile) {
      try {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-logos')
          .upload(filePath, logoFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading logo:', error);
        toast({
          title: t("companies.logoError"),
          description: t("companies.logoError"),
          variant: "destructive"
        });
        setUploadingLogo(false);
        return;
      }
    }
    const companyData = {
      name: newCompany.name,
      address: newCompany.address || null,
      street_address: newCompany.street_address || null,
      city: newCompany.city || null,
      province_state: newCompany.province_state || null,
      postal_code: newCompany.postal_code || null,
      country: newCompany.country || null,
      phone: newCompany.phone || null,
      email: newCompany.email || null,
      website: newCompany.website || null,
      tax_id: newCompany.tax_id || null,
      contact_person: newCompany.contact_person || null,
      logo_url: logoUrl || null,
      taxes: taxes.length > 0 ? taxes : [],
      default_due_days: newCompany.default_due_days,
      invoice_email_subject: newCompany.invoice_email_subject,
      invoice_email_message: newCompany.invoice_email_message,
      overdue_email_subject: newCompany.overdue_email_subject,
      overdue_email_message: newCompany.overdue_email_message,
      payment_confirmation_email_subject: newCompany.payment_confirmation_email_subject,
      payment_confirmation_email_message: newCompany.payment_confirmation_email_message,
      invoice_footer_message: newCompany.invoice_footer_message,
      invoice_footer_message_fr: newCompany.invoice_footer_message_fr,
      invoice_body_message: newCompany.invoice_body_message,
      invoice_body_message_fr: newCompany.invoice_body_message_fr
    };
    
    if (editingCompany) {
      await updateCompany(editingCompany.id, companyData);
    } else {
      await createCompany(companyData);
    }

    resetForm();
    setUploadingLogo(false);
  };

  const resetForm = () => {
    setLogoFile(null);
    setLogoError(null);
    setNewCompany({
      name: "",
      address: "",
      street_address: "",
      city: "",
      province_state: "",
      postal_code: "",
      country: "Canada",
      phone: "",
      email: "",
      website: "",
      tax_id: "",
      contact_person: "",
      logo_url: "",
      default_due_days: 7,
      invoice_email_subject: "Invoice {invoice_number} from {company_name}",
      invoice_email_message: `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${"{total}"}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
      overdue_email_subject: "Payment Overdue - Invoice {invoice_number}",
      overdue_email_message: `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${"{total}"}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
      payment_confirmation_email_subject: "Payment Confirmation - Invoice {invoice_number}",
      payment_confirmation_email_message: `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: ${"{total}"}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
      invoice_footer_message: "Thank you for your business!",
      invoice_footer_message_fr: "Merci pour votre confiance !",
      invoice_body_message: "",
      invoice_body_message_fr: ""
    });
    setTaxes([]);
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const handleAddCompanyClick = async () => {
    console.log('[Companies] Checking company limit...');
    const limitCheck = await checkLimit('companies');
    console.log('[Companies] Limit check result:', limitCheck);
    
    if (!limitCheck.canAdd) {
      console.log('[Companies] Limit reached, showing dialog');
      setShowLimitDialog(true);
      return;
    }
    console.log('[Companies] Limit OK, opening dialog');
    setIsDialogOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setLogoFile(null);
    setNewCompany({
      name: company.name,
      address: company.address || "",
      street_address: (company as any).street_address || "",
      city: (company as any).city || "",
      province_state: (company as any).province_state || "",
      postal_code: (company as any).postal_code || "",
      country: (company as any).country || "Canada",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      tax_id: company.tax_id || "",
      contact_person: company.contact_person || "",
      logo_url: company.logo_url || "",
      default_due_days: company.default_due_days || 7,
      invoice_email_subject: (company as any).invoice_email_subject || "Invoice {invoice_number} from {company_name}",
      invoice_email_message: (company as any).invoice_email_message || `Dear {client_name},

Please find attached your invoice {invoice_number} dated {issue_date}.

Amount due: ${"{total}"}
Due date: {due_date}

Thank you for your business!

Best regards,
{company_name}`,
      overdue_email_subject: (company as any).overdue_email_subject || "Payment Overdue - Invoice {invoice_number}",
      overdue_email_message: (company as any).overdue_email_message || `Dear {client_name},

This is a friendly reminder that your invoice {invoice_number} dated {issue_date} is now overdue.

Original amount: ${"{total}"}
Due date: {due_date}
Days overdue: {days_overdue}

Please remit payment at your earliest convenience to avoid any late fees.

If you have already sent payment, please disregard this notice.

Thank you for your prompt attention to this matter.

Best regards,
{company_name}`,
      payment_confirmation_email_subject: (company as any).payment_confirmation_email_subject || "Payment Confirmation - Invoice {invoice_number}",
      payment_confirmation_email_message: (company as any).payment_confirmation_email_message || `Dear {client_name},

We have successfully received your payment for invoice {invoice_number}.

Payment details:
- Invoice: {invoice_number}
- Amount: ${"{total}"}
- Date paid: {payment_date}

Thank you for your prompt payment and continued business!

Best regards,
{company_name}`,
      invoice_footer_message: (company as any).invoice_footer_message || "Thank you for your business!",
      invoice_footer_message_fr: (company as any).invoice_footer_message_fr || "Merci pour votre confiance !",
      invoice_body_message: (company as any).invoice_body_message || "",
      invoice_body_message_fr: (company as any).invoice_body_message_fr || ""
    });
    // Handle taxes - parse JSON if it exists
    if (company.taxes && Array.isArray(company.taxes)) {
      setTaxes(company.taxes as Array<{name: string, percentage: number}>);
    } else {
      setTaxes([]);
    }
    setIsDialogOpen(true);
  };


  if (loading) {
    return <div>{t("companies.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("companies.title")}</h1>
          <p className="text-muted-foreground">
            {t("companies.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleAddCompanyClick}>
            <Plus className="h-4 w-4 mr-2" />
            {t("companies.addButton")}
          </Button>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? t("companies.dialog.edit") : t("companies.dialog.add")}</DialogTitle>
              <DialogDescription>
                {editingCompany ? t("companies.dialog.editDesc") : t("companies.dialog.addDesc")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("companies.name")} *</Label>
                <Input
                  id="name"
                  placeholder={t("companies.namePlaceholder")}
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  required
                />
              </div>
              {/* Address fields */}
              <div className="space-y-4">
                <Label className="text-base font-medium">{t("companies.address")}</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="street_address">{t("companies.streetAddress")}</Label>
                  <Input
                    id="street_address"
                    placeholder={t("companies.streetPlaceholder")}
                    value={newCompany.street_address}
                    onChange={(e) => setNewCompany({...newCompany, street_address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">{t("companies.city")}</Label>
                    <Input
                      id="city"
                      placeholder={t("companies.cityPlaceholder")}
                      value={newCompany.city}
                      onChange={(e) => setNewCompany({...newCompany, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">{t("companies.postalCode")}</Label>
                    <Input
                      id="postal_code"
                      placeholder={t("companies.postalPlaceholder")}
                      value={newCompany.postal_code}
                      onChange={(e) => setNewCompany({...newCompany, postal_code: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">{t("companies.country")}</Label>
                  <Select value={newCompany.country} onValueChange={(value) => {
                    setNewCompany({...newCompany, country: value, province_state: ""});
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("companies.countryPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province_state">
                    {t("companies.provinceState")}
                  </Label>
                  {(() => {
                    const regions = getRegionsForCountry(newCompany.country);
                    return regions ? (
                      <Select value={newCompany.province_state} onValueChange={(value) => {
                        setNewCompany({...newCompany, province_state: value});
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("companies.provinceStatePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-popover max-h-[300px]">
                          {regions.map((region) => (
                            <SelectItem key={region.value} value={region.value}>
                              {region.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="province_state"
                        placeholder={t("companies.provinceStatePlaceholder")}
                        value={newCompany.province_state}
                        onChange={(e) => setNewCompany({...newCompany, province_state: e.target.value})}
                      />
                    );
                  })()}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("companies.phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  pattern="[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}"
                  placeholder={t("companies.phonePlaceholder")}
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                  title={t("companies.validation.phoneInvalid")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("companies.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("companies.emailPlaceholder")}
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">{t("companies.contactPerson")}</Label>
                <Input
                  id="contact_person"
                  placeholder={t("companies.contactPlaceholder")}
                  value={newCompany.contact_person}
                  onChange={(e) => setNewCompany({...newCompany, contact_person: e.target.value})}
                />
              </div>
              
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo">{t("companies.logo")}</Label>
                <div className="flex items-center space-x-4">
                  {newCompany.logo_url && (
                    <div className="relative w-16 h-16 border rounded-lg overflow-hidden group flex items-center justify-center bg-muted/30">
                      <img 
                        src={newCompany.logo_url} 
                        alt={t("companies.currentLogo")} 
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setNewCompany({...newCompany, logo_url: ""});
                          setLogoFile(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file format by MIME type AND extension
                          const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
                          const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
                          const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                          
                          if (!validMimeTypes.includes(file.type) || !validExtensions.includes(fileExtension)) {
                            setLogoError(t("companies.validation.logoFormatError"));
                            e.target.value = ''; // Reset input
                            return;
                          }
                          
                          // Validate file size (max 2MB)
                          const maxSize = 2 * 1024 * 1024; // 2MB in bytes
                          if (file.size > maxSize) {
                            setLogoError(t("companies.validation.logoSizeError"));
                            e.target.value = ''; // Reset input
                            return;
                          }
                          
                          // Clear error and set file
                          setLogoError(null);
                          setLogoFile(file);
                          // Show preview
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setNewCompany({...newCompany, logo_url: e.target?.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("companies.logoHint")}
                    </p>
                    {logoError && (
                      <p className="text-xs text-destructive mt-1">
                        {logoError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">{t("companies.website")}</Label>
                <Input
                  id="website"
                  placeholder={t("companies.websitePlaceholder")}
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">{t("companies.taxId")}</Label>
                <Input
                  id="tax_id"
                  placeholder={t("companies.taxIdPlaceholder")}
                  value={newCompany.tax_id}
                  onChange={(e) => setNewCompany({...newCompany, tax_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_due_days">{t("companies.dueDefault")}</Label>
                <Input
                  id="default_due_days"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="7"
                  value={newCompany.default_due_days}
                  onChange={(e) => setNewCompany({...newCompany, default_due_days: parseInt(e.target.value) || 7})}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("companies.taxes")}</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addTax}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("companies.addTax")}
                  </Button>
                </div>
                {taxes.map((tax, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor={`tax-name-${index}`}>{t("companies.taxName")}</Label>
                      <Input
                        id={`tax-name-${index}`}
                        placeholder={t("companies.taxNamePlaceholder")}
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label htmlFor={`tax-percentage-${index}`}>{t("companies.taxRate")}</Label>
                      <Input
                        id={`tax-percentage-${index}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.0001"
                        placeholder={t("companies.taxRatePlaceholder")}
                        value={tax.percentage}
                        onChange={(e) => {
                          const value = e.target.value.replace(',', '.');
                          updateTax(index, 'percentage', parseFloat(value) || 0);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTax(index)}
                      className="mb-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  {t("companies.cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={uploadingLogo || !!logoError}>
                  {uploadingLogo ? t("companies.uploadingLogo") : editingCompany ? t("companies.updateButton") : t("companies.addCompany")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company, index) => {
          const isOverLimit = planLimits && planLimits.max_companies !== null && index >= planLimits.max_companies;
          
          return (
            <Card key={company.id} className={`hover:shadow-lg transition-shadow ${isOverLimit ? 'border-orange-500/50' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {company.logo_url ? (
                        <img 
                          src={company.logo_url} 
                          alt={`${company.name} logo`}
                          className="max-w-full max-h-full w-auto h-auto object-contain"
                          onError={(e) => {
                            // Fallback to icon if logo fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.logo-fallback')?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <Building2 className={`h-5 w-5 text-primary logo-fallback ${company.logo_url ? 'hidden' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        {isOverLimit && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/50">
                            {language === "fr" ? "Hors limite" : "Over Limit"}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{t("companies.companyLabel")}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {formatAddress(company) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {formatAddress(company)}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    {company.phone}
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    {company.email}
                  </div>
                )}
                {company.contact_person && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    {company.contact_person}
                  </div>
                )}
              </div>

              {(company.website || company.tax_id || (company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0)) && (
                <div className="pt-4 border-t space-y-2">
                  {company.website && (
                    <div>
                      <p className="text-sm font-medium">{t("companies.websiteLabel")}</p>
                      <p className="text-sm text-muted-foreground">{company.website}</p>
                    </div>
                  )}
                  {company.tax_id && (
                    <div>
                      <p className="text-sm font-medium">{t("companies.taxIdLabel")}</p>
                      <p className="text-sm text-muted-foreground">{company.tax_id}</p>
                    </div>
                  )}
                  {company.taxes && Array.isArray(company.taxes) && company.taxes.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">{t("companies.taxesLabel")}</p>
                      <div className="space-y-1">
                        {(company.taxes as Array<{name: string, percentage: number}>).map((tax, index) => (
                          <div key={index} className="flex items-center text-sm text-muted-foreground">
                            <Percent className="h-4 w-4 mr-2" />
                            {tax.name}: {tax.percentage}%
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(company)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t("companies.updateButton")}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("companies.delete")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("companies.deleteConfirm")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("companies.cancel")}</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteCompany(company.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("companies.deleteButton")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Limit Reached Alert Dialog */}
      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "fr" ? "Limite atteinte" : "Limit Reached"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "fr" 
                ? "Vous avez atteint la limite de compagnies pour votre plan actuel. Veuillez passer à un plan supérieur pour ajouter plus de compagnies."
                : "You have reached the company limit for your current plan. Please upgrade to add more companies."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "fr" ? "Annuler" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/dashboard/pricing")}>
              {language === "fr" ? "Voir les tarifs" : "View Pricing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Companies;