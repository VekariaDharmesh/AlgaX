import httpx
import time
import sys

API_URL = "http://localhost:8000"

def get_ponds():
    r = httpx.get(f"{API_URL}/api/ponds")
    r.raise_for_status()
    return r.json()

def inject_scenario(pond_id, scenario):
    r = httpx.post(f"http://localhost:8001/control/inject-scenario", json={"pond_id": pond_id, "scenario": scenario})
    if r.status_code != 200:
        print("Simulator might be down or endpoint missing. Cannot run E2E.")
        sys.exit(1)

def get_anomalies():
    r = httpx.get(f"{API_URL}/api/anomalies", params={"page_size": 100})
    r.raise_for_status()
    return r.json()["items"]

def main():
    print("Fetching ponds...")
    ponds = get_ponds()
    if not ponds:
        print("No ponds found.")
        sys.exit(1)
        
    pond_id = ponds[0]["id"]
    
    print(f"Injecting nutrient_depletion into pond {pond_id}...")
    inject_scenario(pond_id, "nutrient_depletion")
    
    print("Waiting for biological anomaly detection (checking up to 90s)...")
    found_anomalies = []
    biological_found = False
    for _ in range(45):
        time.sleep(2)
        anomalies = get_anomalies()
        new = [a for a in anomalies if a["pond_id"] == pond_id]
        if new:
            found_anomalies = new
            biological = [a for a in new if a["source_provenance"] == "biological_engine"]
            if biological:
                biological_found = True
                break
            
    if not biological_found:
        print("FAIL: No biological anomaly detected after injecting scenario.")
        sys.exit(1)
        
    print(f"Found {len(found_anomalies)} anomalies. Verifying taxonomy and relationships...")
    
    # Check if there is an explanation record
    biological = [a for a in found_anomalies if a["source_provenance"] == "biological_engine"]
    if not biological:
        print("FAIL: No biological anomaly detected (expected for nutrient_depletion).")
        sys.exit(1)
        
    bio = biological[0]
    print(f"Biological anomaly detected: {bio['anomaly_type']}")
    
    exp = bio.get("explanation_record")
    if not exp:
        print("FAIL: Biological anomaly missing explanation_record.")
        sys.exit(1)
        
    print(f"Explanation found! Confidence: {exp['confidence']}, Evidence Strength: {exp['evidence_strength']}")
    
    # Ensure no 'caused by' language
    if 'caused by' in exp['summary'].lower() or 'proven cause' in exp['summary'].lower():
        print(f"FAIL: Explanation uses forbidden causal language: {exp['summary']}")
        sys.exit(1)
        
    # Check priority scoring
    if bio["priority_score"] <= 0:
        print("FAIL: Priority score not calculated correctly.")
        sys.exit(1)
        
    print("E2E Test PASS.")

if __name__ == "__main__":
    main()
