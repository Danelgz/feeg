import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getPosts, addToCollection, likePost, addComment } from "../lib/firebase";

export default function Home() {
  const { user, authUser, isLoaded, theme } = useUser();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [commentingOn, setCommentingOn] = useState(null);
  const [newComment, setNewComment] = useState("");
  const isDark = true; // Mantener oscuro para coherencia con el perfil

  useEffect(() => {
    const unsub = getPosts(setPosts);
    return () => unsub();
  }, []);

  const handleCreatePost = async () => {
    if (!newPost.trim() || !authUser) return;
    await addToCollection("posts", {
      text: newPost,
      authorId: authUser.uid,
      authorName: user?.username || authUser.displayName || "Usuario",
      authorPhoto: user?.photoURL || authUser.photoURL || null,
      likes: [],
      comments: []
    });
    setNewPost("");
  };

  const handleLike = async (postId) => {
    if (!authUser) return;
    await likePost(postId, authUser.uid);
  };

  const handleAddComment = async (postId) => {
    if (!newComment.trim() || !authUser) return;
    await addComment(postId, {
      text: newComment,
      authorId: authUser.uid,
      authorName: user?.username || authUser.displayName || "Usuario"
    });
    setNewComment("");
    setCommentingOn(null);
  };

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: "#fff" }}>Cargando...</div></Layout>;

  return (
    <Layout>
      <div style={{ backgroundColor: "#000", color: "#fff", minHeight: "100vh", padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "20px" }}>Inicio</h1>

        {/* Create Post */}
        {authUser && (
          <div style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px", marginBottom: "25px" }}>
            <textarea
              placeholder="¿Qué estás entrenando hoy?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "1rem",
                resize: "none",
                outline: "none",
                minHeight: "80px"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                onClick={handleCreatePost}
                style={{
                  backgroundColor: "#008CFF",
                  color: "#fff",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Publicar
              </button>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {posts.map(post => (
            <div key={post.id} style={{ backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#333", overflow: "hidden" }}>
                  {post.authorPhoto ? <img src={post.authorPhoto} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                </div>
                <div>
                  <div style={{ fontWeight: "bold" }}>@{post.authorName}</div>
                  <div style={{ fontSize: "0.75rem", color: "#888" }}>{new Date(post.createdAt).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ marginBottom: "15px", fontSize: "1rem", lineHeight: "1.4" }}>
                {post.text}
              </div>

              <div style={{ display: "flex", gap: "20px", borderTop: "1px solid #333", paddingTop: "10px" }}>
                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: post.likes?.includes(authUser?.uid) ? "#008CFF" : "#888",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={post.likes?.includes(authUser?.uid) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  {post.likes?.length || 0}
                </button>
                <button
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  {post.comments?.length || 0}
                </button>
              </div>

              {/* Comments Section */}
              {commentingOn === post.id && (
                <div style={{ marginTop: "15px", paddingTop: "10px", borderTop: "1px solid #333" }}>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                    <input
                      placeholder="Escribe un comentario..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: "#000",
                        border: "1px solid #333",
                        borderRadius: "20px",
                        padding: "8px 15px",
                        color: "#fff",
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      style={{ backgroundColor: "#008CFF", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "20px", cursor: "pointer" }}
                    >
                      Enviar
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {post.comments?.map((comment, i) => (
                      <div key={i} style={{ fontSize: "0.9rem" }}>
                        <span style={{ fontWeight: "bold", marginRight: "8px" }}>@{comment.authorName}</span>
                        <span style={{ color: "#ccc" }}>{comment.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
