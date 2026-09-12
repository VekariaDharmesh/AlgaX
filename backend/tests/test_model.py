from app.model_engine import (
    calculate_light_factor,
    calculate_temperature_factor,
    calculate_ph_factor,
    calculate_nitrogen_factor,
    calculate_carbon_fraction,
    run_model_step,
    DEFAULT_PARAMS
)

def test_limitation_factors():
    # Light
    assert calculate_light_factor(0.0, 500) == 0.0
    assert calculate_light_factor(500.0, 500) == 0.5
    assert calculate_light_factor(2000.0, 500) == 0.8
    
    # Temperature
    opt_t = DEFAULT_PARAMS["T_opt"]
    assert calculate_temperature_factor(opt_t, opt_t, 10.0) == 1.0 # Optimal
    assert calculate_temperature_factor(opt_t + 10, opt_t, 10.0) < 0.4 # Suboptimal
    
    # pH
    opt_ph = DEFAULT_PARAMS["pH_opt"]
    assert calculate_ph_factor(opt_ph, opt_ph, 1.5) == 1.0
    
    # Nitrogen
    assert calculate_nitrogen_factor(2.0, 2.0) == 0.5
    assert calculate_nitrogen_factor(0.0, 2.0) == 0.0

def test_growth_dynamics():
    snapshot_good = {
        "light": 1000.0,
        "temperature": 27.0,
        "ph": 7.5,
        "nitrogen": 15.0
    }
    
    # Healthy scenario
    out_good = run_model_step(snapshot_good, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    assert out_good["growth_rate"] > 0
    assert out_good["new_biomass"] > 1.0
    
    # Nutrient Depletion
    snapshot_poor = snapshot_good.copy()
    snapshot_poor["nitrogen"] = 0.1
    out_poor = run_model_step(snapshot_poor, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    
    # Nitrogen limitation should lower growth
    assert out_poor["nitrogen_factor"] < out_good["nitrogen_factor"]
    assert out_poor["growth_rate"] < out_good["growth_rate"]
    assert out_poor["new_biomass"] < out_good["new_biomass"]

def test_carbon_fraction():
    f_n_high = calculate_nitrogen_factor(15.0, 2.0)
    f_n_low = calculate_nitrogen_factor(0.1, 2.0)
    
    c_frac_healthy = calculate_carbon_fraction(0.48, 0.08, f_n_high)
    c_frac_stressed = calculate_carbon_fraction(0.48, 0.08, f_n_low)
    
    # Lower nitrogen -> higher stress -> higher carbon fraction
    assert c_frac_stressed > c_frac_healthy
    assert c_frac_stressed <= 0.56
    assert c_frac_healthy >= 0.48

from app.model_engine import calculate_carbon_metrics

def test_carbon_unspecified_end_use():
    metrics = calculate_carbon_metrics(
        delta_biomass_g_l=0.5,
        volume_liters=100000,
        carbon_fraction=0.5,
        end_use="unspecified"
    )
    assert metrics["gross_co2_kg"] > 0
    assert metrics["net_carbon_removed_kg"] is None
    assert metrics["retained_co2_kg"] is None

def test_carbon_specified_end_use():
    metrics = calculate_carbon_metrics(
        delta_biomass_g_l=0.5,
        volume_liters=100000,
        carbon_fraction=0.5,
        end_use="biochar",
        operational_emissions=10.0
    )
    assert metrics["gross_co2_kg"] > 0
    assert metrics["retained_co2_kg"] == metrics["gross_co2_kg"] * 0.8
    assert metrics["net_carbon_removed_kg"] == metrics["retained_co2_kg"] - 10.0

def test_heatwave():
    snapshot_good = {
        "light": 1000.0,
        "temperature": 27.0,
        "ph": 7.5,
        "nitrogen": 15.0
    }
    out_good = run_model_step(snapshot_good, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    
    snapshot_hot = snapshot_good.copy()
    snapshot_hot["temperature"] = 35.0
    out_hot = run_model_step(snapshot_hot, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    
    # Temperature moves away from optimum -> limitation worsens -> growth changes
    assert out_hot["temperature_factor"] < out_good["temperature_factor"]
    assert out_hot["growth_rate"] < out_good["growth_rate"]
    assert out_hot["new_biomass"] < out_good["new_biomass"]

def test_edge_cases():
    snapshot_good = {
        "light": 1000.0,
        "temperature": 27.0,
        "ph": 7.5,
        "nitrogen": 15.0
    }
    # Zero biomass
    out_zero = run_model_step(snapshot_good, current_biomass=0.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    assert out_zero["new_biomass"] == 0.0 # Cannot grow from nothing
    
    # Negative biomass (should be clamped or prevented)
    out_neg = run_model_step(snapshot_good, current_biomass=-1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    assert out_neg["new_biomass"] == 0.0 # Should prevent negative biomass
    
    # Missing sensor data -> extreme penalty (or defaults)
    snapshot_missing = {}
    out_missing = run_model_step(snapshot_missing, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    assert out_missing["growth_rate"] < 0 # Respiration should dominate if f_I = 0, f_N = 0
    assert out_missing["new_biomass"] < 1.0
    assert out_missing["new_biomass"] >= 0.0

def test_reproducibility():
    snapshot = {
        "light": 1000.0,
        "temperature": 27.0,
        "ph": 7.5,
        "nitrogen": 15.0
    }
    out1 = run_model_step(snapshot, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    out2 = run_model_step(snapshot, current_biomass=1.0, params=DEFAULT_PARAMS, dt_hours=1.0)
    
    assert out1 == out2
    
    # Change one parameter -> different result
    params_mod = DEFAULT_PARAMS.copy()
    params_mod["mu_max"] = 0.2
    out3 = run_model_step(snapshot, current_biomass=1.0, params=params_mod, dt_hours=1.0)
    assert out3["new_biomass"] != out1["new_biomass"]
