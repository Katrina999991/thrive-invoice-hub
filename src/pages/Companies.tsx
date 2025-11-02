import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    default:
      return null;
  }
};

const Companies = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { companies, loading, createCompany, updateCompany, deleteCompany } = useCompanies();

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
    invoice_prefix: "INV",
    invoice_digits: 3,
    invoice_start_number: 1,
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
    invoice_footer_message_fr: "Merci pour votre confiance !"
  });

  const [taxes, setTaxes] = useState<Array<{name: string, percentage: number}>>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

      // Check if another company has the same prefix
      const prefixConflict = otherCompanies.some(c => 
        (c as any).invoice_prefix === newCompany.invoice_prefix
      );

      if (prefixConflict) {
        toast({
          title: t("companies.validation.error"),
          description: t("companies.validation.prefixConflict"),
          variant: "destructive"
        });
        return false;
      }

      // Generate potential invoice numbers based on the new configuration
      const maxCheck = 100; // Check first 100 potential numbers
      const potentialNumbers: string[] = [];
      for (let i = 0; i < maxCheck; i++) {
        const num = (newCompany.invoice_start_number || 1) + i;
        const formatted = `${newCompany.invoice_prefix}-${num.toString().padStart(newCompany.invoice_digits, '0')}`;
        potentialNumbers.push(formatted);
      }

      // Check if any potential number already exists
      const existingNumbers = new Set(existingInvoices?.map(inv => inv.invoice_number) || []);
      const conflicts = potentialNumbers.filter(num => existingNumbers.has(num));

      if (conflicts.length > 0) {
        toast({
          title: t("companies.validation.error"),
          description: t("companies.validation.numberConflict").replace('{numbers}', conflicts.slice(0, 5).join(', ')),
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating invoice numbering:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      invoice_prefix: newCompany.invoice_prefix,
      invoice_digits: newCompany.invoice_digits,
      invoice_start_number: newCompany.invoice_start_number,
      invoice_email_subject: newCompany.invoice_email_subject,
      invoice_email_message: newCompany.invoice_email_message,
      overdue_email_subject: newCompany.overdue_email_subject,
      overdue_email_message: newCompany.overdue_email_message,
      payment_confirmation_email_subject: newCompany.payment_confirmation_email_subject,
      payment_confirmation_email_message: newCompany.payment_confirmation_email_message,
      invoice_footer_message: newCompany.invoice_footer_message,
      invoice_footer_message_fr: newCompany.invoice_footer_message_fr
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
      invoice_prefix: "INV",
      invoice_digits: 3,
      invoice_start_number: 1,
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
      invoice_footer_message_fr: "Merci pour votre confiance !"
    });
    setTaxes([]);
    setEditingCompany(null);
    setIsDialogOpen(false);
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
      invoice_prefix: (company as any).invoice_prefix || "INV",
      invoice_digits: (company as any).invoice_digits || 3,
      invoice_start_number: (company as any).invoice_start_number || 1,
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
      invoice_footer_message_fr: (company as any).invoice_footer_message_fr || "Merci pour votre confiance !"
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
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("companies.addButton")}
            </Button>
          </DialogTrigger>
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
                    <div className="w-16 h-16 border rounded-lg overflow-hidden">
                      <img 
                        src={newCompany.logo_url} 
                        alt={t("companies.currentLogo")} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
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
                      Upload PNG, JPG, or GIF (max 2MB)
                    </p>
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
                <Label>{t("companies.invoiceSettings")} *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="invoicePrefix" className="text-sm">{t("companies.invoicePrefix")} *</Label>
                    <Input
                      id="invoicePrefix"
                      placeholder={t("companies.invoicePrefixPlaceholder")}
                      value={newCompany.invoice_prefix}
                      onChange={(e) => setNewCompany({...newCompany, invoice_prefix: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceDigits" className="text-sm">{t("companies.invoiceDigits")} *</Label>
                    <Input
                      id="invoiceDigits"
                      type="number"
                      min="1"
                      max="10"
                      value={newCompany.invoice_digits}
                      onChange={(e) => setNewCompany({...newCompany, invoice_digits: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceStartNumber" className="text-sm">{t("companies.invoiceStart")} *</Label>
                    <Input
                      id="invoiceStartNumber"
                      type="number"
                      min="1"
                      value={newCompany.invoice_start_number}
                      onChange={(e) => setNewCompany({...newCompany, invoice_start_number: Number(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Preview: {newCompany.invoice_prefix}-{String(newCompany.invoice_start_number).padStart(newCompany.invoice_digits, '0')}
                </p>
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
                <Button type="submit" className="flex-1" disabled={uploadingLogo}>
                  {uploadingLogo ? t("companies.uploadingLogo") : editingCompany ? t("companies.updateButton") : t("companies.addCompany")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
                    {company.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={`${company.name} logo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
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
        ))}
      </div>
    </div>
  );
};

export default Companies;