from gtts import gTTS
import os

out_dir = r"c:\Users\ELCOT\Desktop\smartwasteroute\frontend\audio"
os.makedirs(out_dir, exist_ok=True)

wastes = {
    "plastic": ("Hazardous waste detected: Plastic.", "எச்சரிக்கை! பிளாஸ்டிக் கழிவு."),
    "glass": ("Hazardous waste detected: Glass.", "எச்சரிக்கை! கண்ணாடி கழிவு."),
    "metal": ("Hazardous waste detected: Metal.", "எச்சரிக்கை! உலோக கழிவு.")
}

for name, (en_text, ta_text) in wastes.items():
    tts_en = gTTS(text=en_text, lang='en')
    tts_ta = gTTS(text=ta_text, lang='ta')
    
    en_file = os.path.join(out_dir, f"en_{name}.mp3")
    ta_file = os.path.join(out_dir, f"ta_{name}.mp3")
    final_file = os.path.join(out_dir, f"{name}.mp3")
    
    tts_en.save(en_file)
    tts_ta.save(ta_file)
    
    # Concatenate mp3s
    with open(final_file, "wb") as f_out:
        with open(en_file, "rb") as en_in:
            f_out.write(en_in.read())
        with open(ta_file, "rb") as ta_in:
            f_out.write(ta_in.read())
            
    # Remove temp files
    os.remove(en_file)
    os.remove(ta_file)
    print(f"Generated {final_file}")
