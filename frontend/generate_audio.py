import asyncio
import edge_tts
import os

out_dir = r"c:\Users\ELCOT\Desktop\smartwasteroute\frontend\audio"
os.makedirs(out_dir, exist_ok=True)

wastes = {
    "plastic": ("Hazardous waste detected: Plastic. Handle it with care.", "எச்சரிக்கை! பிளாஸ்டிக் கழிவு. கவனமாகக் கையாளவும்."),
    "glass": ("Hazardous waste detected: Glass. Handle it with care.", "எச்சரிக்கை! கண்ணாடி கழிவு. கவனமாகக் கையாளவும்."),
    "metal": ("Hazardous waste detected: Metal. Handle it with care.", "எச்சரிக்கை! உலோகக் கழிவு. கவனமாகக் கையாளவும்.")
}

en_voice = "en-IN-PrabhatNeural" # Male Indian English voice
ta_voice = "ta-IN-PallaviNeural"  # Female Tamil voice, clear articulation

async def generate():
    for name, (en_text, ta_text) in wastes.items():
        en_file = os.path.join(out_dir, f"en_{name}.mp3")
        ta_file = os.path.join(out_dir, f"ta_{name}.mp3")
        final_file = os.path.join(out_dir, f"{name}.mp3")

        communicate_en = edge_tts.Communicate(en_text, en_voice)
        await communicate_en.save(en_file)

        communicate_ta = edge_tts.Communicate(ta_text, ta_voice)
        await communicate_ta.save(ta_file)

        # Concatenate mp3s
        with open(final_file, "wb") as f_out:
            with open(en_file, "rb") as en_in:
                f_out.write(en_in.read())
            with open(ta_file, "rb") as ta_in:
                f_out.write(ta_in.read())

        os.remove(en_file)
        os.remove(ta_file)
        print(f"Generated {final_file}")

if __name__ == "__main__":
    asyncio.run(generate())
