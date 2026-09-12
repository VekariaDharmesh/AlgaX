import math
from typing import Dict, Any, Optional

MODEL_VERSION = "v1.0.0"

# Default Model Parameters
DEFAULT_PARAMS = {
    "mu_max": 0.1,         # max growth rate (per hour)
    "K_I": 500.0,          # light half-saturation (W/m2)
    "T_opt": 27.0,         # optimal temp (C)
    "sigma_T": 10.0,       # temp width
    "pH_opt": 7.5,         # optimal pH
    "sigma_pH": 1.5,       # pH width
    "K_N": 2.0,            # nitrogen half-saturation (mg/L)
    "m": 0.01,             # respiration/mortality rate
    "C_base": 0.48,        # base carbon fraction
    "delta_C": 0.08,       # stress-induced carbon fraction increase
}

def calculate_light_factor(I: float, K_I: float) -> float:
    if I <= 0: return 0.0
    return I / (I + K_I)

def calculate_temperature_factor(T: float, T_opt: float, sigma_T: float) -> float:
    # f(T) = exp(-((T - T_opt) / sigma_T)^2)
    if T is None: return 0.1 # extreme penalty if missing
    return math.exp(-((T - T_opt) / sigma_T)**2)

def calculate_ph_factor(pH: float, pH_opt: float, sigma_pH: float) -> float:
    if pH is None: return 0.5
    return math.exp(-((pH - pH_opt) / sigma_pH)**2)

def calculate_nitrogen_factor(N: float, K_N: float) -> float:
    if N is None or N <= 0: return 0.0
    return N / (N + K_N)

def calculate_growth_rate(mu_max: float, f_I: float, f_T: float, f_pH: float, f_N: float) -> float:
    return mu_max * f_I * f_T * f_pH * f_N

def calculate_carbon_fraction(C_base: float, delta_C: float, f_N: float) -> float:
    # C_frac = C_base + ΔC * (1 - f(N))
    frac = C_base + delta_C * (1.0 - f_N)
    return min(max(frac, C_base), C_base + delta_C)

def run_model_step(snapshot: dict, current_biomass: float, params: dict, dt_hours: float = 1.0) -> dict:
    f_I = calculate_light_factor(snapshot.get("light", 0.0), params["K_I"])
    f_T = calculate_temperature_factor(snapshot.get("temperature"), params["T_opt"], params["sigma_T"])
    f_pH = calculate_ph_factor(snapshot.get("ph"), params["pH_opt"], params["sigma_pH"])
    f_N = calculate_nitrogen_factor(snapshot.get("nitrogen"), params["K_N"])
    
    mu = calculate_growth_rate(params["mu_max"], f_I, f_T, f_pH, f_N)
    
    # dB/dt = (mu - m) * B
    # Biomass change over dt_hours
    net_mu = mu - params["m"]
    
    # Simple Euler integration
    delta_b = current_biomass * net_mu * dt_hours
    new_biomass = max(0.0, current_biomass + delta_b)
    
    # Carbon fraction
    c_frac = calculate_carbon_fraction(params["C_base"], params["delta_C"], f_N)
    
    return {
        "light_factor": f_I,
        "temperature_factor": f_T,
        "ph_factor": f_pH,
        "nitrogen_factor": f_N,
        "growth_rate": net_mu, # Net growth rate
        "new_biomass": new_biomass,
        "delta_biomass": delta_b,
        "carbon_fraction": c_frac
    }

def calculate_carbon_metrics(delta_biomass_g_l: float, volume_liters: float, carbon_fraction: float, end_use: str, operational_emissions: float = 0.0) -> dict:
    # total biomass change in kg
    delta_biomass_kg = (delta_biomass_g_l * volume_liters) / 1000.0
    
    if delta_biomass_kg <= 0:
        gross_co2 = 0.0
    else:
        # Gross CO2 = Biomass * C_frac * (44/12)
        gross_co2 = delta_biomass_kg * carbon_fraction * (44.0 / 12.0)
        
    retention_factor_map = {
        "biochar": 0.8,
        "bioplastics": 0.5,
        "fuel": 0.0,
        "unspecified": None
    }
    
    retention_factor = retention_factor_map.get(end_use, None)
    
    if retention_factor is None:
        return {
            "gross_co2_kg": gross_co2,
            "retained_co2_kg": None,
            "operational_emissions_kg": operational_emissions,
            "net_carbon_removed_kg": None,
            "realized_c_fraction": carbon_fraction
        }
        
    retained_co2 = gross_co2 * retention_factor
    net_co2 = max(0.0, retained_co2 - operational_emissions)
    
    return {
        "gross_co2_kg": gross_co2,
        "retained_co2_kg": retained_co2,
        "operational_emissions_kg": operational_emissions,
        "net_carbon_removed_kg": net_co2,
        "realized_c_fraction": carbon_fraction
    }
