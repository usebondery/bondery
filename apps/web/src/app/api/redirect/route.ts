import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { validateImageUpload } from "@/lib/imageValidation";

interface ProfileData {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImageUrl?: string;
  title?: string;
  place?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProfileData = await request.json();
    const {
      instagram,
      linkedin,
      facebook,
      firstName,
      middleName,
      lastName,
      profileImageUrl,
      title,
      place,
    } = body;

    if (!instagram && !linkedin && !facebook) {
      return NextResponse.json(
        { error: "Instagram, LinkedIn, or Facebook username is required" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query to look up contact
    let query = supabase.from("contacts").select("id, avatar, title, place").eq("user_id", user.id);

    if (instagram) {
      query = query.eq("instagram", instagram);
    } else if (linkedin) {
      query = query.eq("linkedin", linkedin);
    } else if (facebook) {
      query = query.eq("facebook", facebook);
    }

    const { data: existingContact, error: lookupError } = await query.single();

    if (lookupError && lookupError.code !== "PGRST116") {
      console.error("Error looking up contact:", lookupError);
      return NextResponse.json({ error: "Failed to look up contact" }, { status: 500 });
    }

    // If contact exists
    if (existingContact) {
      // Update profile photo if provided and contact doesn't have one
      if (profileImageUrl && !existingContact.avatar) {
        await updateContactPhoto(supabase, existingContact.id, user.id, profileImageUrl);
      }

      // Update title if provided and contact doesn't have one
      if (title && !existingContact.title) {
        await supabase.from("contacts").update({ title }).eq("id", existingContact.id);
      }

      // Update place if provided and contact doesn't have one
      if (place && !existingContact.place) {
        await supabase.from("contacts").update({ place }).eq("id", existingContact.id);
      }

      return NextResponse.json({
        contactId: existingContact.id,
        existed: true,
      });
    }

    // Contact doesn't exist, create a new one
    const insertData: {
      user_id: string;
      instagram?: string;
      linkedin?: string;
      facebook?: string;
      first_name: string;
      middle_name?: string;
      last_name?: string;
      title?: string;
      place?: string;
      created_at: string;
      updated_at: string;
    } = {
      user_id: user.id,
      first_name: firstName || instagram || linkedin || facebook || "Unknown",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (instagram) insertData.instagram = instagram;
    if (linkedin) insertData.linkedin = linkedin;
    if (facebook) insertData.facebook = facebook;
    if (middleName) insertData.middle_name = middleName;
    if (lastName) insertData.last_name = lastName;
    if (title) insertData.title = title;
    if (place) insertData.place = place;

    const { data: newContact, error: createError } = await supabase
      .from("contacts")
      .insert(insertData)
      .select("id")
      .single();

    if (createError || !newContact) {
      console.error("Error creating contact:", createError);
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    // Upload profile photo if provided
    if (profileImageUrl) {
      await updateContactPhoto(supabase, newContact.id, user.id, profileImageUrl);
    }

    return NextResponse.json({
      contactId: newContact.id,
      existed: false,
    });
  } catch (error) {
    console.error("Unexpected error in /api/redirect POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updateContactPhoto(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  contactId: string,
  userId: string,
  imageUrl: string,
) {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) return;

    const blob = await response.blob();

    // Validate file type and size
    const validation = validateImageUpload({
      type: blob.type,
      size: blob.size,
    });
    if (!validation.isValid) {
      console.error("Image validation failed:", validation.error);
      return;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage: userId/contactId.jpg
    const fileName = `${userId}/${contactId}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: blob.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading photo:", uploadError);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      // Update contact with avatar URL
      await supabase.from("contacts").update({ avatar: urlData.publicUrl }).eq("id", contactId);
    }
  } catch (error) {
    console.error("Error in updateContactPhoto:", error);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instagramUsername = searchParams.get("instagram");
  const linkedinUsername = searchParams.get("linkedin");
  const facebookUsername = searchParams.get("facebook");
  const firstName = searchParams.get("firstName");
  const middleName = searchParams.get("middleName");
  const lastName = searchParams.get("lastName");
  const profileImageUrl = searchParams.get("profileImageUrl");
  const title = searchParams.get("title");
  const place = searchParams.get("place");

  if (!instagramUsername && !linkedinUsername && !facebookUsername) {
    return NextResponse.json(
      { error: "Instagram, LinkedIn, or Facebook username is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Redirect to login with return URL
      const returnUrl = `/api/redirect?${searchParams.toString()}`;
      return NextResponse.redirect(
        new URL(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, request.url),
      );
    }

    // Build query to look up contact
    let query = supabase.from("contacts").select("id, avatar, title, place").eq("user_id", user.id);

    if (instagramUsername) {
      query = query.eq("instagram", instagramUsername);
    } else if (linkedinUsername) {
      query = query.eq("linkedin", linkedinUsername);
    } else if (facebookUsername) {
      query = query.eq("facebook", facebookUsername);
    }

    const { data: existingContact, error: lookupError } = await query.single();

    if (lookupError && lookupError.code !== "PGRST116") {
      // PGRST116 is "no rows found", which is fine
      console.error("Error looking up contact:", lookupError);
      return NextResponse.json({ error: "Failed to look up contact" }, { status: 500 });
    }

    // If contact exists
    if (existingContact) {
      // Update profile photo if provided and contact doesn't have one
      if (profileImageUrl && !existingContact.avatar) {
        await updateContactPhoto(supabase, existingContact.id, user.id, profileImageUrl);
      }

      // Update title if provided and contact doesn't have one
      if (title && !existingContact.title) {
        await supabase.from("contacts").update({ title }).eq("id", existingContact.id);
      }

      // Update place if provided and contact doesn't have one
      if (place && !existingContact.place) {
        await supabase.from("contacts").update({ place }).eq("id", existingContact.id);
      }

      return NextResponse.redirect(
        new URL(`/app/person?person_id=${existingContact.id}`, request.url),
      );
    }

    // Contact doesn't exist, create a new one
    const insertData: {
      user_id: string;
      instagram?: string;
      linkedin?: string;
      facebook?: string;
      first_name: string;
      middle_name?: string;
      last_name?: string;
      title?: string;
      place?: string;
      created_at: string;
      updated_at: string;
    } = {
      user_id: user.id,
      first_name:
        firstName || instagramUsername || linkedinUsername || facebookUsername || "Unknown",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (instagramUsername) insertData.instagram = instagramUsername;
    if (linkedinUsername) insertData.linkedin = linkedinUsername;
    if (facebookUsername) insertData.facebook = facebookUsername;
    if (middleName) insertData.middle_name = middleName;
    if (lastName) insertData.last_name = lastName;
    if (title) insertData.title = title;
    if (place) insertData.place = place;

    const { data: newContact, error: createError } = await supabase
      .from("contacts")
      .insert(insertData)
      .select("id")
      .single();

    if (createError || !newContact) {
      console.error("Error creating contact:", createError);
      return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
    }

    // Upload profile photo if provided
    if (profileImageUrl) {
      await updateContactPhoto(supabase, newContact.id, user.id, profileImageUrl);
    }

    // Redirect to the newly created contact's page
    return NextResponse.redirect(new URL(`/app/person?person_id=${newContact.id}`, request.url));
  } catch (error) {
    console.error("Unexpected error in /api/redirect:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
